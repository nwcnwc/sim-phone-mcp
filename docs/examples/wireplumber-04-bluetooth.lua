-- WirePlumber 0.4 example: oFono HFP backend (PipeWire 1.2.x).
-- Install under your WirePlumber config path, e.g.:
--   ~/.config/wireplumber/bluetooth.lua.d/50-sim-phone-hfp_hf.lua
-- Replace ADAPTER_NAME with your BlueZ adapter name if you pin one.

rule = {
  matches = {
    {
      { "device.name", "matches", "bluez_card.*" },
    },
  },
  apply_properties = {
    ["bluez5.hfphsp-backend"] = "ofono",
    ["bluez5.headset-roles"] = "[ hfp_hf ]",
  },
}

table.insert(bluez_rules, rule)
