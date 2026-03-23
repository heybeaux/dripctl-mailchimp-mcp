#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAudienceTools } from "./tools/audiences.js";
import { registerCampaignTools } from "./tools/campaigns.js";
import { registerTemplateTools } from "./tools/templates.js";
import { registerSegmentTools } from "./tools/segments.js";
import { registerInsightTools } from "./tools/insights.js";
import { createMailchimpClient } from "./mailchimp.js";

const server = new McpServer({
  name: "dripctl-mailchimp",
  version: "0.1.0",
});

// Mailchimp client — initialized from env
const mc = createMailchimpClient();

// Register all tools
registerAudienceTools(server, mc);
registerCampaignTools(server, mc);
registerTemplateTools(server, mc);
registerSegmentTools(server, mc);
registerInsightTools(server, mc);

// Start
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
