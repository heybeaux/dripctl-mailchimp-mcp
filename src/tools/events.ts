import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fireEvent } from "../dripctl.js";

export function registerEventTools(server: McpServer) {

  server.tool(
    "dripctl_fire_event",
    "Fire a dripctl event to trigger automated sequences. Use for lifecycle events like campaign completions, milestones, or custom triggers.",
    {
      eventType: z.string().describe("Event type — e.g. 'campaign.completed', 'donor.milestone', 'user.signup'"),
      userId: z.string().describe("User/contact identifier (email is fine)"),
      payload: z.record(z.string(), z.any()).optional().default({}).describe("Event data — campaign results, donor info, etc."),
    },
    async ({ eventType, userId, payload }) => {
      const id = await fireEvent(eventType, userId, payload);
      return {
        content: [{
          type: "text" as const,
          text: id
            ? `Event fired: ${eventType} for ${userId} (id: ${id})`
            : "dripctl not configured. Set DRIPCTL_API_URL, DRIPCTL_API_KEY, and DRIPCTL_TENANT_ID env vars.",
        }],
      };
    }
  );

  server.tool(
    "dripctl_campaign_completed",
    "Record that a campaign has been analyzed and trigger any follow-up sequences. Fires a dripctl event and stores the results in memory.",
    {
      clientName: z.string().describe("Client/organization name"),
      campaignId: z.string().describe("Mailchimp campaign ID"),
      campaignSubject: z.string().describe("Campaign subject line"),
      openRate: z.number().describe("Open rate as decimal"),
      clickRate: z.number().describe("Click rate as decimal"),
      revenue: z.number().optional().describe("Revenue generated"),
      performanceNote: z.string().describe("Brief performance assessment"),
    },
    async (params) => {
      const id = await fireEvent('campaign.completed', params.clientName, {
        campaignId: params.campaignId,
        subject: params.campaignSubject,
        openRate: params.openRate,
        clickRate: params.clickRate,
        revenue: params.revenue,
        note: params.performanceNote,
      });

      return {
        content: [{
          type: "text" as const,
          text: id
            ? `Campaign completion event fired for ${params.clientName}. Any configured follow-up sequences will trigger.`
            : "Event not fired (dripctl not configured). Campaign data noted but no sequences triggered.",
        }],
      };
    }
  );
}
