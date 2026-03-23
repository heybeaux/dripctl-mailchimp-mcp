import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerTemplateTools(server: McpServer, mc: any) {
  server.tool(
    "mailchimp_templates_list",
    "List available email templates",
    {
      type: z.enum(["user", "gallery"]).optional().default("user").describe("Template type"),
    },
    async ({ type }) => {
      try {
        const response = await mc.templates.list({ type, count: 50 });
        const templates = response.templates.map((t: any) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          active: t.active,
          dateCreated: t.date_created,
        }));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(templates, null, 2) }],
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
