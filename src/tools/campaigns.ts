import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerCampaignTools(server: McpServer, mc: any) {
  server.tool(
    "mailchimp_campaigns_list",
    "List recent campaigns with performance stats",
    {
      count: z.number().optional().default(10).describe("Number of campaigns to return"),
      status: z.enum(["sent", "draft", "schedule", "sending"]).optional().describe("Filter by status"),
    },
    async ({ count, status }) => {
      try {
        const opts: any = { count, sort_field: "send_time", sort_dir: "DESC" };
        if (status) opts.status = status;

        const response = await mc.campaigns.list(opts);
        const campaigns = response.campaigns.map((c: any) => ({
          id: c.id,
          subject: c.settings?.subject_line,
          fromName: c.settings?.from_name,
          status: c.status,
          sendTime: c.send_time,
          audienceId: c.recipients?.list_id,
          audienceName: c.recipients?.list_name,
          recipientCount: c.recipients?.recipient_count,
          opens: c.report_summary?.opens,
          uniqueOpens: c.report_summary?.unique_opens,
          openRate: c.report_summary?.open_rate,
          clicks: c.report_summary?.clicks,
          clickRate: c.report_summary?.click_rate,
          subscriberClicks: c.report_summary?.subscriber_clicks,
        }));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(campaigns, null, 2) }],
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
    "mailchimp_campaigns_report",
    "Get detailed performance report for a specific campaign",
    { campaignId: z.string().describe("The Mailchimp campaign ID") },
    async ({ campaignId }) => {
      try {
        const [report, links] = await Promise.all([
          mc.reports.getCampaignReport(campaignId),
          mc.reports.getCampaignClickDetails(campaignId),
        ]);

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              campaignTitle: report.campaign_title,
              subject: report.subject_line,
              sendTime: report.send_time,
              emailsSent: report.emails_sent,
              opens: {
                total: report.opens.opens_total,
                unique: report.opens.unique_opens,
                rate: report.opens.open_rate,
                lastOpen: report.opens.last_open,
              },
              clicks: {
                total: report.clicks.clicks_total,
                unique: report.clicks.unique_clicks,
                rate: report.clicks.click_rate,
                lastClick: report.clicks.last_click,
              },
              bounces: {
                hard: report.bounces.hard_bounces,
                soft: report.bounces.soft_bounces,
              },
              unsubscribes: report.unsubscribed,
              forwardCount: report.forwards?.forwards_count,
              topLinks: links.urls_clicked?.slice(0, 10).map((l: any) => ({
                url: l.url,
                clicks: l.total_clicks,
                uniqueClicks: l.unique_clicks,
                clickRate: l.click_percentage,
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
