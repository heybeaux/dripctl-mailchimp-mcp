import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { forecastCampaign, mean, stddev } from "../simulaas.js";

export function registerForecastTools(server: McpServer, mc: any) {

  server.tool(
    "dripctl_forecast_campaign",
    "Forecast campaign outcomes using Monte Carlo simulation. Pulls historical data from Mailchimp automatically and runs 50,000 simulations to predict opens, clicks, conversions, and revenue with confidence intervals. Use this BEFORE sending a campaign.",
    {
      audienceId: z.string().describe("Mailchimp audience ID to pull history from"),
      audienceSize: z.number().describe("How many recipients for this campaign"),
      averageGift: z.number().optional().describe("Expected $ per conversion (for revenue forecast)"),
      historicalCampaignCount: z.number().optional().default(20).describe("How many past campaigns to use as priors"),
    },
    async ({ audienceId, audienceSize, averageGift, historicalCampaignCount }) => {
      try {
        const response = await mc.campaigns.list({
          count: historicalCampaignCount,
          status: "sent",
          list_id: audienceId,
          sort_field: "send_time",
          sort_dir: "DESC",
        });

        const campaigns = response.campaigns.filter((c: any) => c.report_summary);

        if (campaigns.length < 3) {
          return {
            content: [{
              type: "text" as const,
              text: "Need at least 3 sent campaigns with data to build a forecast. Found: " + campaigns.length,
            }],
          };
        }

        const openRates = campaigns.map((c: any) => c.report_summary.open_rate || 0);
        const clickRates = campaigns.map((c: any) => c.report_summary.click_rate || 0);

        const forecast = forecastCampaign({
          audienceSize,
          historicalOpenRates: openRates,
          historicalClickRates: clickRates,
          averageGift,
          simulationCount: 50_000,
        });

        const pct = (n: number) => (n * 100).toFixed(1) + '%';
        const num = (n: number) => Math.round(n).toLocaleString();
        const dollar = (n: number) => '$' + Math.round(n).toLocaleString();

        const report = [
          `## Campaign Forecast (${num(forecast.simulationCount)} simulations)`,
          `Based on ${campaigns.length} historical campaigns for this audience.\n`,
          `### Expected Opens`,
          `  Pessimistic (P10): ${num(forecast.opens.p10)} (${pct(forecast.openRate.p10)})`,
          `  Likely (P25-P75):  ${num(forecast.opens.p25)} - ${num(forecast.opens.p75)}`,
          `  Median:            ${num(forecast.opens.median)} (${pct(forecast.openRate.median)})`,
          `  Optimistic (P90):  ${num(forecast.opens.p90)} (${pct(forecast.openRate.p90)})\n`,
          `### Expected Clicks`,
          `  Pessimistic (P10): ${num(forecast.clicks.p10)} (${pct(forecast.clickRate.p10)} of opens)`,
          `  Median:            ${num(forecast.clicks.median)} (${pct(forecast.clickRate.median)})`,
          `  Optimistic (P90):  ${num(forecast.clicks.p90)} (${pct(forecast.clickRate.p90)})\n`,
          `### Expected Conversions`,
          `  Pessimistic (P10): ${num(forecast.conversions.p10)}`,
          `  Median:            ${num(forecast.conversions.median)}`,
          `  Optimistic (P90):  ${num(forecast.conversions.p90)}`,
        ];

        if (forecast.revenue) {
          report.push(
            `\n### Expected Revenue`,
            `  Pessimistic (P10): ${dollar(forecast.revenue.p10)}`,
            `  Median:            ${dollar(forecast.revenue.median)}`,
            `  Optimistic (P90):  ${dollar(forecast.revenue.p90)}`,
          );
        }

        report.push(
          `\n### Historical Baseline`,
          `  Avg open rate:  ${pct(mean(openRates))} (σ ${pct(stddev(openRates))})`,
          `  Avg click rate: ${pct(mean(clickRates))} (σ ${pct(stddev(clickRates))})`,
          `  Campaigns used: ${campaigns.length}`,
        );

        return {
          content: [{ type: "text" as const, text: report.join('\n') }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Forecast error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );
}
