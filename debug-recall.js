#!/usr/bin/env node
// Quick debug script to test recall from the same env as Claude Desktop would
process.env.ENGRAM_API_URL = "https://api.openengram.ai";
process.env.ENGRAM_API_KEY = "eng_dca0a9f0cb98341af8daca93e2070bff6c60b78ef2cf829b";

async function test() {
  console.log("Node version:", process.version);
  console.log("fetch available:", typeof fetch);
  
  try {
    console.log("\n1. Testing DNS resolution...");
    const dns = await import('dns');
    dns.default.resolve('api.openengram.ai', (err, addresses) => {
      if (err) console.log("DNS error:", err.message);
      else console.log("DNS resolved:", addresses);
    });

    console.log("\n2. Testing fetch to Engram...");
    const res = await fetch("https://api.openengram.ai/v1/memories/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AM-API-Key": process.env.ENGRAM_API_KEY,
        "X-AM-User-ID": "beaux",
      },
      body: JSON.stringify({ query: "Heybeaux campaign", limit: 3 }),
    });
    console.log("HTTP status:", res.status);
    const data = await res.json();
    console.log("Memories found:", data.memories?.length || 0);
    if (data.memories?.[0]) {
      console.log("First memory:", (data.memories[0].raw || "").slice(0, 100));
    }
  } catch (err) {
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
  }
}

test();
