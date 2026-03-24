import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { storeMemory, recallMemories } from "../engram.js";

export function registerMemoryTools(server: McpServer, mc: any) {

  server.tool(
    "dripctl_remember_campaign",
    "Store campaign performance data in memory for future reference. Call this after analyzing campaign results so dripctl learns from every campaign.",
    {
      clientName: z.string().describe("Client/organization name"),
      campaignSubject: z.string().describe("Email subject line"),
      audienceSize: z.number().describe("Number of recipients"),
      openRate: z.number().describe("Open rate as decimal (e.g. 0.24)"),
      clickRate: z.number().describe("Click rate as decimal"),
      conversionRate: z.number().optional().describe("Conversion rate if known"),
      revenue: z.number().optional().describe("Revenue generated"),
      sendDay: z.string().optional().describe("Day of week sent"),
      sendTime: z.string().optional().describe("Time sent"),
      segment: z.string().optional().describe("Audience segment used"),
      learnings: z.string().describe("What worked, what didn't, and why — your analysis"),
    },
    async (params) => {
      const content = [
        `Campaign for ${params.clientName}: "${params.campaignSubject}"`,
        `Audience: ${params.audienceSize} recipients${params.segment ? ` (segment: ${params.segment})` : ''}`,
        `Results: ${(params.openRate * 100).toFixed(1)}% open, ${(params.clickRate * 100).toFixed(1)}% click`,
        params.conversionRate ? `Conversion: ${(params.conversionRate * 100).toFixed(1)}%` : null,
        params.revenue ? `Revenue: $${params.revenue.toLocaleString()}` : null,
        params.sendDay ? `Sent: ${params.sendDay}${params.sendTime ? ` at ${params.sendTime}` : ''}` : null,
        `\nAnalysis: ${params.learnings}`,
      ].filter(Boolean).join('\n');

      const id = await storeMemory(content, {
        clientName: params.clientName,
        campaignSubject: params.campaignSubject,
        openRate: params.openRate,
        clickRate: params.clickRate,
        conversionRate: params.conversionRate,
        revenue: params.revenue,
        sendDay: params.sendDay,
      });

      return {
        content: [{
          type: "text" as const,
          text: id
            ? `Stored in memory (${id}). I'll reference this data when planning future campaigns for ${params.clientName}.`
            : "Memory storage unavailable (Engram not configured). Campaign data was not persisted.",
        }],
      };
    }
  );

  server.tool(
    "dripctl_recall_campaigns",
    "Recall past campaign performance and patterns for a client. Use this before planning new campaigns to make data-driven recommendations.",
    {
      query: z.string().describe("What to recall — e.g. 'best performing year-end appeals' or 'campaign history for Share'"),
      limit: z.number().optional().default(10).describe("Max results"),
    },
    async ({ query, limit }) => {
      const memories = await recallMemories(query, limit);

      if (memories.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: "No campaign memories found. I'll start building memory as we analyze campaigns together. Use dripctl_remember_campaign after reviewing campaign results.",
          }],
        };
      }

      const formatted = memories.map((m, i) =>
        `[${i + 1}] (relevance: ${(m.significance * 100).toFixed(0)}%)\n${m.content}`
      ).join('\n\n---\n\n');

      return {
        content: [{
          type: "text" as const,
          text: `Found ${memories.length} relevant campaign memories:\n\n${formatted}`,
        }],
      };
    }
  );
}
