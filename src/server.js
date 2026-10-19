import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPhoneTools } from './tools.js';

export const NAME = 'sim-phone-mcp';
export const VERSION = '0.1.0';
export const README = 'https://github.com/nwcnwc/sim-phone-mcp#readme';

export const product = {
  name: NAME,
  version: VERSION,
  readme: README,
};

export function createServer(ctx) {
  const server = new McpServer({ name: NAME, version: VERSION });
  registerPhoneTools(server, ctx);
  return server;
}
