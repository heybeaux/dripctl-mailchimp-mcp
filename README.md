# dripctl-mailchimp-mcp

MCP server that gives Claude read access to Mailchimp campaign data.

## Setup

1. Get a Mailchimp API key: https://mailchimp.com/help/about-api-keys/
2. Set env var: `export MAILCHIMP_API_KEY=your-key-here`
3. Install & build:
   ```bash
   npm install
   npm run build
   ```

## Claude Desktop Config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mailchimp": {
      "command": "node",
      "args": ["/path/to/dripctl-mailchimp-mcp/dist/index.js"],
      "env": {
        "MAILCHIMP_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| mailchimp_audiences_list | List all audiences with stats |
| mailchimp_audiences_get | Get audience details + merge fields |
| mailchimp_campaigns_list | List recent campaigns with performance |
| mailchimp_campaigns_report | Detailed campaign report with link clicks |
| mailchimp_templates_list | List email templates |
| mailchimp_segments_list | List audience segments/tags |
| mailchimp_insights_summary | Aggregated patterns and recommendations |

## Example Prompts

- "How did my last 5 campaigns perform?"
- "What day of the week gets the best open rates?"
- "Compare my Q1 campaigns to Q4"
- "Which audience segment is most engaged?"
