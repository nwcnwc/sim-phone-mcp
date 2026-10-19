#!/usr/bin/env node
// sim-phone-mcp: MCP over stdio — Bluetooth HFP phone tools for your agent.
import { runMain } from '../src/main.js';
import { product } from '../src/server.js';

await runMain(product);
