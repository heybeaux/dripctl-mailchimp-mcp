import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSegmentTools(server: McpServer, mc: any) {
  server.tool(
    "mailchimp_segments_list",
    "List segments/tags for an audience",
    { audienceId: z.string().describe("The Mailchimp audience/list ID") },
    async ({ audienceId }) => {
      try {
        const response = await mc.lists.listSegments(audienceId, { count: 100 });
        const segments = response.segments.map((s: any) => ({
          id: s.id,
          name: s.name,
          memberCount: s.member_count,
          type: s.type,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(segments, null, 2) }],
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
