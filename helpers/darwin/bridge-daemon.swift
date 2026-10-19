#!/usr/bin/env swift
// sim-phone macOS HFP bridge helper (JSON lines on stdin/stdout).
// See docs/platforms.md for SCO limitations on recent macOS releases.

import Foundation
import IOBluetooth
import AVFoundation

final class BridgeState {
    var callState = "idle"
}

let state = BridgeState()

func writeResponse(id: String, result: [String: Any]? = nil, error: String? = nil) {
    var obj: [String: Any] = ["id": id]
    if let error = error {
        obj["error"] = error
    } else if let result = result {
        obj["result"] = result
    }
    if let data = try? JSONSerialization.data(withJSONObject: obj),
       let line = String(data: data, encoding: .utf8) {
        print(line)
        fflush(stdout)
    }
}

func bluetoothStatus() -> [String: Any] {
    guard let host = IOBluetoothHostController.default() else {
        return ["adapterPowered": false, "adapterName": NSNull(), "pairedPhone": NSNull()]
    }
    let powered = host.powerState == kBluetoothHCIPowerStateON
    var paired: [String: Any]? = nil
    if let devices = IOBluetoothDevice.pairedDevices() as? [IOBluetoothDevice] {
        for dev in devices where dev.isConnected() {
            paired = ["alias": dev.name ?? "Phone", "hfpConnected": true]
            break
        }
        if paired == nil, let first = devices.first {
            paired = ["alias": first.name ?? "Phone", "hfpConnected": false]
        }
    }
    return [
        "adapterPowered": powered,
        "adapterName": "Bluetooth",
        "pairedPhone": paired as Any
    ]
}

func hasCallAudio() -> [String: Any] {
    let active = state.callState == "active" || state.callState == "outgoing"
    // On macOS, HFP SCO may be unavailable to third-party HF apps; Core Audio only exposes
    // hands-free endpoints when the OS has brought up SCO for the paired phone.
    return ["uplink": active, "downlink": active]
}

func handle(method: String, params: [String: Any]) -> (result: [String: Any]?, error: String?) {
    switch method {
    case "ping":
        return (["ok": true, "platform": "darwin"], nil)
    case "shutdown":
        return (["ok": true], nil)
    case "bluetooth_status":
        return (bluetoothStatus(), nil)
    case "dial":
        guard params["number"] is String else {
            return (nil, "dial requires number")
        }
        state.callState = "outgoing"
        return (["ok": true], nil)
    case "answer":
        state.callState = "active"
        return (["ok": true], nil)
    case "hang_up":
        state.callState = "idle"
        return (["ok": true], nil)
    case "get_call_state":
        return (["state": state.callState, "calls": []], nil)
    case "has_call_audio":
        return (hasCallAudio(), nil)
    case "play_uplink":
        guard let path = params["wavPath"] as? String else {
            return (nil, "wavPath required")
        }
        let url = URL(fileURLWithPath: path)
        do {
            let file = try AVAudioFile(forReading: url)
            let engine = AVAudioEngine()
            let player = AVAudioPlayerNode()
            engine.attach(player)
            engine.connect(player, to: engine.mainMixerNode, format: file.processingFormat)
            try engine.start()
            player.scheduleFile(file, at: nil)
            player.play()
            while player.isPlaying {
                Thread.sleep(forTimeInterval: 0.05)
            }
            engine.stop()
            return (["ok": true, "deviceName": "default-output"], nil)
        } catch {
            return (nil, error.localizedDescription)
        }
    case "record_downlink":
        guard let out = params["wavPath"] as? String else {
            return (nil, "wavPath required")
        }
        guard let seconds = params["seconds"] as? Int else {
            return (nil, "seconds required")
        }
        let url = URL(fileURLWithPath: out)
        let engine = AVAudioEngine()
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        let file = try? AVAudioFile(forWriting: url, settings: format.settings)
        guard let file = file else {
            return (nil, "cannot create output file")
        }
        input.installTap(onBus: 0, bufferSize: 4096, format: format) { buffer, _ in
            try? file.write(from: buffer)
        }
        do {
            try engine.start()
            Thread.sleep(forTimeInterval: TimeInterval(seconds))
            input.removeTap(onBus: 0)
            engine.stop()
            return (["ok": true], nil)
        } catch {
            return (nil, error.localizedDescription)
        }
    default:
        return (nil, "unknown method: \(method)")
    }
}

while let line = readLine(strippingNewline: true) {
    if line.trimmingCharacters(in: .whitespaces).isEmpty { continue }
    guard let data = line.data(using: .utf8),
          let req = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let id = req["id"] as? String,
          let method = req["method"] as? String else { continue }
    let params = req["params"] as? [String: Any] ?? [:]
    let (result, error) = handle(method: method, params: params)
    writeResponse(id: id, result: result, error: error)
    if method == "shutdown" { break }
}
