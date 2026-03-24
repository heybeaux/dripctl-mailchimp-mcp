const ENGRAM_API_URL = process.env.ENGRAM_API_URL || 'https://api.openengram.ai';
const ENGRAM_API_KEY = process.env.ENGRAM_API_KEY;

interface EngramMemory {
  id: string;
  content: string;
  raw: string;
  layer: string;
  significance: number;
  score?: number;
  metadata: Record<string, any>;
}

export async function storeMemory(content: string, metadata: Record<string, any>): Promise<string | null> {
  if (!ENGRAM_API_KEY) {
    console.error('[engram] No ENGRAM_API_KEY set — memory storage disabled');
    return null;
  }

  try {
    const res = await fetch(`${ENGRAM_API_URL}/v1/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AM-API-Key': ENGRAM_API_KEY,
        'X-AM-User-ID': 'beaux',
      },
      body: JSON.stringify({
        content,
        layer: 'PROJECT',
        type: 'observation',
        source: 'AGENT_OBSERVATION',
        agentId: 'dripctl',
        significance: 0.7,
        metadata: {
          source: 'dripctl-mailchimp-mcp',
          type: 'campaign_performance',
          ...metadata,
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[engram] Store failed: HTTP ${res.status} — ${errText.slice(0, 200)}`);
      return null;
    }
    const data = await res.json() as { id?: string };
    return data.id || null;
  } catch (err) {
    console.error('[engram] Store error:', err);
    return null;
  }
}

export async function recallMemories(query: string, limit: number = 10): Promise<EngramMemory[]> {
  if (!ENGRAM_API_KEY) {
    console.error('[engram] No ENGRAM_API_KEY set — recall disabled');
    return [];
  }

  try {
    const res = await fetch(`${ENGRAM_API_URL}/v1/memories/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AM-API-Key': ENGRAM_API_KEY,
        'X-AM-User-ID': 'beaux',
      },
      body: JSON.stringify({ query, limit }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[engram] Recall failed: HTTP ${res.status} — ${errText.slice(0, 200)}`);
      return [];
    }
    const data = await res.json() as { memories?: any[] };
    // Normalize: Engram returns 'raw' for content, map to 'content' for consistency
    return (data.memories || []).map((m: any) => ({
      ...m,
      content: m.raw || m.content || '',
      significance: m.score || m.significance || m.effectiveScore || 0.5,
    }));
  } catch (err) {
    console.error('[engram] Recall error:', err);
    return [];
  }
}
