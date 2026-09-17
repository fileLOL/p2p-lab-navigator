import type { NormalizedOpportunity, RawOffer, SearchParams } from "./types";

/**
 * Opportunity Engine: normaliza, calcula diferenciales y ordena.
 * No promete beneficios: el diferencial es solo una referencia.
 */

export function computeSpread(
  offer: RawOffer,
  referencePrice: number | null,
): { spread: number | null; spreadPct: number | null } {
  if (!referencePrice || referencePrice <= 0) return { spread: null, spreadPct: null };
  // Comprar barato o vender caro es favorable para el usuario.
  const raw = offer.side === "buy" ? referencePrice - offer.price : offer.price - referencePrice;
  return { spread: raw, spreadPct: (raw / referencePrice) * 100 };
}

export function amountFit(offer: RawOffer, amount?: number | null): number {
  if (!amount || amount <= 0) return 0.5;
  const min = offer.amountMin ?? 0;
  const max = offer.amountMax ?? Number.POSITIVE_INFINITY;
  if (amount >= min && amount <= max) return 1;
  const distance = amount < min ? min - amount : amount - max;
  return Math.max(0, 1 - distance / Math.max(amount, 1)) * 0.5;
}

export function freshness(offer: RawOffer, now = Date.now()): number {
  const ts = Date.parse(offer.timestamp);
  if (Number.isNaN(ts)) return 0.5;
  const ageMinutes = Math.max(0, (now - ts) / 60000);
  return Math.max(0, 1 - ageMinutes / 60);
}

export function normalizeOffers(
  offers: RawOffer[],
  referencePrice: number | null,
  params: SearchParams,
  now = Date.now(),
): NormalizedOpportunity[] {
  const normalized = offers.map((offer) => {
    const { spread, spreadPct } = computeSpread(offer, referencePrice);
    const spreadScore = spreadPct === null ? 0 : Math.max(-5, Math.min(5, spreadPct)) / 5;
    const score =
      spreadScore * 0.6 + amountFit(offer, params.amount) * 0.25 + freshness(offer, now) * 0.15;
    return { ...offer, referencePrice, spread, spreadPct, score };
  });

  return normalized.sort((a, b) => b.score - a.score).slice(0, params.limit);
}
