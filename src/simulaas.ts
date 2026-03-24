// SimulaaS-style Monte Carlo campaign forecasting
// Runs client-side — same math as the SimulaaS engine

export interface CampaignForecast {
  opens: Percentiles;
  openRate: Percentiles;
  clicks: Percentiles;
  clickRate: Percentiles;
  conversions: Percentiles;
  conversionRate: Percentiles;
  revenue: Percentiles | null;
  simulationCount: number;
}

export interface Percentiles {
  p10: number; p25: number; median: number; p75: number; p90: number;
  mean: number; min: number; max: number;
}

interface SimResult {
  openRate: number; clickRate: number; convRate: number;
  opened: number; clicked: number; converted: number; revenue: number;
}

export function forecastCampaign(params: {
  audienceSize: number;
  historicalOpenRates: number[];
  historicalClickRates: number[];
  historicalConversionRates?: number[];
  averageGift?: number;
  simulationCount?: number;
}): CampaignForecast {
  const sims = params.simulationCount || 50_000;
  const results: SimResult[] = [];

  const openMean = mean(params.historicalOpenRates);
  const openStd = stddev(params.historicalOpenRates) || openMean * 0.15;
  const clickMean = mean(params.historicalClickRates);
  const clickStd = stddev(params.historicalClickRates) || clickMean * 0.2;
  const convMean = params.historicalConversionRates
    ? mean(params.historicalConversionRates)
    : clickMean * 0.3;
  const convStd = params.historicalConversionRates
    ? stddev(params.historicalConversionRates) || convMean * 0.25
    : convMean * 0.3;

  let seed = 42;
  for (let i = 0; i < sims; i++) {
    seed = mulberry32(seed);
    const openRate = clamp(sampleNormal(seed, openMean, openStd), 0, 1);
    seed = mulberry32(seed);
    const clickRate = clamp(sampleNormal(seed, clickMean, clickStd), 0, 1);
    seed = mulberry32(seed);
    const convRate = clamp(sampleNormal(seed, convMean, convStd), 0, 1);

    const opened = Math.round(params.audienceSize * openRate);
    const clicked = Math.round(opened * clickRate);
    const converted = Math.round(clicked * convRate);
    const revenue = params.averageGift ? converted * params.averageGift : 0;

    results.push({ openRate, clickRate, convRate, opened, clicked, converted, revenue });
  }

  return {
    opens: percentiles(results.map(r => r.opened)),
    openRate: percentiles(results.map(r => r.openRate)),
    clicks: percentiles(results.map(r => r.clicked)),
    clickRate: percentiles(results.map(r => r.clickRate)),
    conversions: percentiles(results.map(r => r.converted)),
    conversionRate: percentiles(results.map(r => r.convRate)),
    revenue: params.averageGift ? percentiles(results.map(r => r.revenue)) : null,
    simulationCount: sims,
  };
}

// --- Math helpers ---

export function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function percentiles(arr: number[]): Percentiles {
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    p10: sorted[Math.floor(n * 0.1)],
    p25: sorted[Math.floor(n * 0.25)],
    median: sorted[Math.floor(n * 0.5)],
    p75: sorted[Math.floor(n * 0.75)],
    p90: sorted[Math.floor(n * 0.9)],
    mean: mean(sorted),
    min: sorted[0],
    max: sorted[n - 1],
  };
}

function mulberry32(seed: number): number {
  let t = (seed + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0);
}

function sampleNormal(seed: number, mean: number, stddev: number): number {
  const u1 = Math.max((seed >>> 0) / 4294967296, 1e-10);
  const u2 = Math.max(mulberry32(seed) / 4294967296, 1e-10);
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stddev * z;
}
