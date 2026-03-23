import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerInsightTools(server: McpServer, mc: any) {
  server.tool(
    "mailchimp_insights_summary",
    "Get aggregated campaign insights: best performing campaigns, patterns, benchmarks. Use this to give strategic recommendations.",
    {
      audienceId: z.string().optional().describe("Filter to specific audience"),
      campaignCount: z.number().optional().default(20).describe("How many past campaigns to analyze"),
    },
    async ({ audienceId, campaignCount }) => {
      try {
        // Fetch recent sent campaigns
        const opts: any = {
          count: campaignCount,
          status: "sent",
          sort_field: "send_time",
          sort_dir: "DESC",
        };
        if (audienceId) opts.list_id = audienceId;

        const response = await mc.campaigns.list(opts);
        const campaigns = response.campaigns;

        if (campaigns.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No sent campaigns found." }],
          };
        }

        // Aggregate stats
        const stats = campaigns
          .filter((c: any) => c.report_summary)
          .map((c: any) => ({
            subject: c.settings?.subject_line,
            sendTime: c.send_time,
            sendDay: c.send_time
              ? new Date(c.send_time).toLocaleDateString("en-US", { weekday: "long" })
              : null,
            sendHour: c.send_time ? new Date(c.send_time).getHours() : null,
            recipientCount: c.recipients?.recipient_count,
            openRate: c.report_summary?.open_rate || 0,
            clickRate: c.report_summary?.click_rate || 0,
            unsubRate:
              c.emails_sent > 0
                ? (c.report_summary?.unsubscribed || 0) / c.emails_sent
                : 0,
          }));

        // Calculate averages
        const avg = (arr: number[]) =>
          arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const openRates = stats.map((s: any) => s.openRate);
        const clickRates = stats.map((s: any) => s.clickRate);

        // Find best/worst
        const bestOpen = stats.reduce((a: any, b: any) =>
          a.openRate > b.openRate ? a : b
        );
        const worstOpen = stats.reduce((a: any, b: any) =>
          a.openRate < b.openRate ? a : b
        );
        const bestClick = stats.reduce((a: any, b: any) =>
          a.clickRate > b.clickRate ? a : b
        );

        // Day-of-week performance
        const byDay: Record<string, number[]> = {};
        stats.forEach((s: any) => {
          if (s.sendDay) {
            if (!byDay[s.sendDay]) byDay[s.sendDay] = [];
            byDay[s.sendDay].push(s.openRate);
          }
        });
        const dayPerformance = Object.entries(byDay)
          .map(([day, rates]) => ({
            day,
            avgOpenRate: avg(rates),
            campaignCount: rates.length,
          }))
          .sort((a, b) => b.avgOpenRate - a.avgOpenRate);

        const summary = {
          campaignsAnalyzed: stats.length,
          dateRange: {
            from: stats[stats.length - 1]?.sendTime,
            to: stats[0]?.sendTime,
          },
          averages: {
            openRate: avg(openRates),
            clickRate: avg(clickRates),
          },
          bestPerformers: {
            highestOpenRate: {
              subject: bestOpen.subject,
              openRate: bestOpen.openRate,
              date: bestOpen.sendTime,
            },
            highestClickRate: {
              subject: bestClick.subject,
              clickRate: bestClick.clickRate,
              date: bestClick.sendTime,
            },
          },
          worstPerformers: {
            lowestOpenRate: {
              subject: worstOpen.subject,
              openRate: worstOpen.openRate,
              date: worstOpen.sendTime,
            },
          },
          dayOfWeekPerformance: dayPerformance,
          recentTrend: {
            last5AvgOpen: avg(openRates.slice(0, 5)),
            previous5AvgOpen: avg(openRates.slice(5, 10)),
            trending:
              avg(openRates.slice(0, 5)) > avg(openRates.slice(5, 10))
                ? "improving"
                : "declining",
          },
        };

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(summary, null, 2),
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
