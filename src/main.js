import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createContext } from './context.js';
import { createServer } from './server.js';

export async function runMain(product, env = process.env) {
  const { name, version } = product;
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stderr.write(
      name + ' ' + version + '\n\n' +
      '  ' + name + '    MCP over stdio\n\n' +
      'Environment: SIMPHONE_HOME, SIMPHONE_OWNER, SIMPHONE_ALLOW, SIMPHONE_CONFIG,\n' +
      'SIMPHONE_HFP (auto|pipewire|ofono|winrt|macos), SIMPHONE_BRIDGE_CMD, SIMPHONE_BRIDGE,\n' +
      'SIMPHONE_BT_ADAPTER, SIMPHONE_VOICE,\n' +
      'SIMPHONE_STT_URL, SIMPHONE_STT_CMD,\n' +
      'SIMPHONE_CHALLENGE_PHRASE, SIMPHONE_CHALLENGE_ANSWER (local only; never logged).\n' +
      (product.readme ? 'See ' + product.readme + '\n' : ''),
    );
    process.exit(0);
  }
  if (argv.includes('--version')) {
    process.stdout.write(version + '\n');
    process.exit(0);
  }

  const ctx = await createContext({ env });
  const server = createServer(ctx);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
