const DRIPCTL_API_URL = process.env.DRIPCTL_API_URL;
const DRIPCTL_API_KEY = process.env.DRIPCTL_API_KEY;
const DRIPCTL_TENANT_ID = process.env.DRIPCTL_TENANT_ID;

export async function fireEvent(eventType: string, userId: string, payload: Record<string, any> = {}): Promise<string | null> {
  if (!DRIPCTL_API_URL || !DRIPCTL_API_KEY || !DRIPCTL_TENANT_ID) return null;

  try {
    const res = await fetch(`${DRIPCTL_API_URL}/api/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DRIPCTL_API_KEY}`,
      },
      body: JSON.stringify({
        eventType,
        userId,
        payload,
        metadata: {
          tenantId: DRIPCTL_TENANT_ID,
          source: 'dripctl-mailchimp-mcp',
        },
      }),
    });
    const data = await res.json() as { id?: string };
    return data.id || null;
  } catch {
    return null;
  }
}
