import type { CardMetrics, Timeframe } from "@/types/card";

/** market cap estimate = prezzo medio x volume di vendite stimato */
export function estimateMarketCap(avgPrice: number, volume: number): number {
  if (!Number.isFinite(avgPrice) || !Number.isFinite(volume)) return 0;
  return Math.max(0, avgPrice * volume);
}

export function percentChange(
  oldPrice: number | null | undefined,
  newPrice: number | null | undefined
): number | null {
  if (oldPrice == null || newPrice == null || oldPrice <= 0) return null;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

export function changeForTimeframe(metrics: CardMetrics, timeframe: Timeframe): number | null {
  switch (timeframe) {
    case "24h":
      return metrics.change24h;
    case "7d":
      return metrics.change7d;
    case "30d":
      return metrics.change30d;
    case "90d":
      return metrics.change90d;
    case "1y":
      return metrics.change1y;
    default:
      return null;
  }
}
