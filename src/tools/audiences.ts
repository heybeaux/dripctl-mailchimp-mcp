import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerAudienceTools(server: McpServer, mc: any) {
  server.tool(
    "mailchimp_audiences_list",
    "List all Mailchimp audiences (lists) with member counts and stats",
    {},
    async () => {
      try {
        const response = await mc.lists.getAllLists();
        const audiences = response.lists.map((list: any) => ({
          id: list.id,
          name: list.name,
          memberCount: list.stats.member_count,
          unsubscribeCount: list.stats.unsubscribe_count,
          openRate: list.stats.open_rate,
          clickRate: list.stats.click_rate,
          lastCampaignSent: list.stats.campaign_last_sent,
        }));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(audiences, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err.message || err}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "mailchimp_audiences_get",
    "Get detailed info about a specific audience including merge fields",
    { audienceId: z.string().describe("The Mailchimp audience/list ID") },
    async ({ audienceId }) => {
      try {
        const [list, mergeFields] = await Promise.all([
          mc.lists.getList(audienceId),
          mc.lists.getListMergeFields(audienceId),
        ]);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              id: list.id,
              name: list.name,
              memberCount: list.stats.member_count,
              openRate: list.stats.open_rate,
              clickRate: list.stats.click_rate,
              mergeFields: mergeFields.merge_fields.map((f: any) => ({
                tag: f.tag,
                name: f.name,
                type: f.type,
              })),
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err.message || err}` }],
          isError: true,
        };
      }
    }
  );
}
