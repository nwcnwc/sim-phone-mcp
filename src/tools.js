import { z } from 'zod';
import { normalizeNumber } from './phone/normalize.js';
import { isAllowed, DISALLOWED_MESSAGE } from './phone/allowlist.js';
import { speakOnCall, hasUplinkAudio } from './audio/speak.js';
import { listenOnCall } from './audio/listen.js';

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(message) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

const NO_TELEPHONY_LINUX =
  'No telephony backend is available. Need org.pipewire.Telephony on the session bus or org.ofono on the system bus. See docs/hfp-backend.md.';

const NO_TELEPHONY_OTHER =
  'No telephony backend is available. Install the platform bridge helper (docs/setup-laptop-bridge.md) or use a Linux bridge host.';

async function dialNumber(ctx, number, action) {
  if (!isAllowed(number, ctx.allowlist)) {
    return err(DISALLOWED_MESSAGE);
  }
  if (!ctx.telephony.available) {
    return err(process.platform === 'linux' ? NO_TELEPHONY_LINUX : NO_TELEPHONY_OTHER);
  }
  const normalized = normalizeNumber(number);
  try {
    await ctx.telephony.dial(normalized);
    ctx.logCall({
      direction: 'outgoing',
      number: normalized,
      action,
      result: 'dialed',
    });
    return ok({ dialed: true, action });
  } catch (e) {
    ctx.logCall({
      direction: 'outgoing',
      number: normalized,
      action,
      result: 'error',
    });
    return err(String((e && e.message) || e));
  }
}

export function registerPhoneTools(server, ctx) {
  server.registerTool('call_owner', {
    title: 'Call the owner',
    description: 'Dials the configured owner number only. There is no argument and no way to redirect the call.',
    inputSchema: {},
  }, async () => {
    if (!ctx.cfg.owner || !String(ctx.cfg.owner).trim()) {
      return err('SIMPHONE_OWNER is not configured.');
    }
    return dialNumber(ctx, ctx.cfg.owner, 'call_owner');
  });

  server.registerTool('dial', {
    title: 'Dial an allowlisted number',
    description: 'Places a call only when the number is on the allowlist (owner by default). Any other number is refused.',
    inputSchema: {
      number: z.string().min(1).describe('E.164 phone number to dial.'),
    },
  }, async ({ number }) => dialNumber(ctx, number, 'dial'));

  server.registerTool('answer', {
    title: 'Answer incoming call',
    description: 'Answers the current incoming Bluetooth HFP call.',
    inputSchema: {},
  }, async () => {
    try {
      await ctx.telephony.answer();
      ctx.logCall({ direction: 'incoming', number: '', action: 'answer', result: 'answered' });
      return ok({ answered: true });
    } catch (e) {
      return err(String((e && e.message) || e));
    }
  });

  server.registerTool('hang_up', {
    title: 'Hang up',
    description: 'Ends the current call.',
    inputSchema: {},
  }, async () => {
    try {
      await ctx.telephony.hangUp();
      ctx.logCall({ direction: 'outgoing', number: '', action: 'hang_up', result: 'hung_up' });
      return ok({ hung_up: true });
    } catch (e) {
      return err(String((e && e.message) || e));
    }
  });

  server.registerTool('status', {
    title: 'Phone and telephony status',
    description: 'Adapter power, paired phone, call state, allowlist size, and backend. Never includes the owner digits.',
    inputSchema: {},
  }, async () => {
    const bt = await ctx.bluetooth.read();
    let call = { state: 'idle' };
    try {
      call = await ctx.telephony.getCallState();
    } catch {
      call = { state: 'unknown' };
    }
    const bridgePlatform = process.platform;
    const bridgeSupported = bridgePlatform === 'linux'
      || ctx.telephony.backend === 'winrt'
      || ctx.telephony.backend === 'macos';
    return ok({
      bridge_platform: bridgePlatform,
      bridge_supported: bridgeSupported,
      bridge_linux_supported: bridgePlatform === 'linux',
      adapter_powered: bt.adapterPowered,
      adapter_name: bt.adapterName,
      paired_phone: bt.pairedPhone,
      call_state: call.state,
      owner_configured: !!(ctx.cfg.owner && String(ctx.cfg.owner).trim()),
      allowlist_size: ctx.allowlist.length,
      telephony_backend: ctx.telephony.backend,
      telephony_available: ctx.telephony.available,
    });
  });

  server.registerTool('speak', {
    title: 'Speak on the call (TTS uplink)',
    description: 'Synthesizes text with Kokoro and plays it on the HFP uplink so the remote party hears it. Requires call audio nodes.',
    inputSchema: {
      text: z.string().min(1).max(8000).describe('Words to speak on the call.'),
    },
  }, async ({ text }) => {
    const audioUp = ctx.audio.hasUplinkAudio
      ? await ctx.audio.hasUplinkAudio()
      : await hasUplinkAudio(ctx.audio);
    if (!audioUp) {
      return err('Call audio is not up yet: no HFP uplink node found in PipeWire. Start or answer a call first.');
    }
    try {
      const speakFn = ctx.audio.speakOnCall || ((t) => speakOnCall(ctx.cfg, t, ctx.audio));
      const node = await speakFn(text);
      return ok({ spoken: true, uplink_node: node?.name || null });
    } catch (e) {
      return err(String((e && e.message) || e));
    }
  });

  server.registerTool('listen', {
    title: 'Listen on the call (downlink)',
    description: 'Records HFP downlink audio for a few seconds and returns a transcript when STT is configured.',
    inputSchema: {
      seconds: z.number().min(1).max(30).optional().describe('Seconds to record (default 5, max 30).'),
    },
  }, async ({ seconds }) => {
    const sec = seconds ?? 5;
    try {
      const listenFn = ctx.audio.listenOnCall
        || ((s) => listenOnCall(s, ctx.cfg, ctx.audio));
      const result = await listenFn(sec);
      return ok({ wav_path: result.wavPath, transcript: result.transcript });
    } catch (e) {
      return err(String((e && e.message) || e));
    }
  });
}
