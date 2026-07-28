// Recohive recommendation engine — transparent, auditable product substitution.
//
// Core principle: the SCORE is 100% deterministic math (an AI only ever writes
// the human reason text, never the ranking). Every point is traceable.
//
// 2026 upgrades layered in below, each fixing a documented weakness of
// big-e-commerce recommenders:
//   1. Causal score breakdown    — every factor's point contribution, so a
//                                  human can audit exactly why A beat B.
//   2. Cold-start by attributes  — ranks brand-new items with ZERO interaction
//                                  history (Amazon's item cold-start pain)
//                                  purely from their attributes.
//   3. Trust-weighted ratings    — dampens implausibly high ratings (the
//                                  fake-review problem Amazon is criticized
//                                  for) so they can't buy their way to #1.
//   4. Intent-aware substitution — honors a shopper goal (budget ceiling,
//                                  "cheaper", in-stock only), the way a person
//                                  shops when their pick is gone. An AI agent
//                                  turns plain English into this intent.
//   5. Anti-filter-bubble pick   — guarantees one honest, diverse discovery so
//                                  users aren't trapped in a bubble.

// ---- factor scores (each returns 0..1) --------------------------------------
function priceScore(sourcePrice, candidatePrice) {
  if (sourcePrice === 0) return candidatePrice === 0 ? 1 : 0;
  return 1 - Math.min(Math.abs(candidatePrice - sourcePrice) / sourcePrice, 1);
}

// Trust: a 4.8-star item with almost no stock is a classic inflated-rating
// pattern. We keep the raw rating for display but discount its INFLUENCE when
// it looks too good to be backed by real supply. Never touches relevance.
function trustFactor(rating, qty) {
  if (rating > 4.5 && qty < 10) return 0.7; // suspiciously high, thinly stocked
  if (rating > 4.7 && qty < 25) return 0.85;
  return 1;
}

function ratingScore(rating) {
  return Math.max(0, Math.min(rating / 5, 1));
}

function inventoryScore(qty) {
  return qty > 0 ? 1 : 0;
}

// Brand affinity: same brand rewards loyalty; a different brand is where
// discovery lives (used by the serendipity pass, not penalized here).
function brandScore(source, candidate) {
  return candidate.brand && source.brand && candidate.brand === source.brand ? 1 : 0.5;
}

function buildTags(source, candidate, qty, trust) {
  const tags = [];
  if (candidate.category === source.category) tags.push("Same Category");
  if (candidate.price < source.price) tags.push("Lower Price");
  if (candidate.rating > source.rating) tags.push("Higher Rating");
  if (qty > 0) tags.push("In Stock");
  if (candidate.brand && candidate.brand === source.brand) tags.push("Same Brand");
  if (trust < 1) tags.push("Rating Under Review");
  return tags;
}

// Weights sum to 100 — the whole score is legible at a glance.
const W = { category: 35, price: 20, rating: 20, inventory: 15, brand: 10 };

function scoreOne(source, candidate, qty) {
  const trust = trustFactor(candidate.rating, qty);
  // Each factor's ACTUAL points, so the UI can show a "why this score" waterfall.
  const breakdown = {
    category: Number((1 * W.category).toFixed(1)),
    price: Number((priceScore(source.price, candidate.price) * W.price).toFixed(1)),
    rating: Number((ratingScore(candidate.rating) * trust * W.rating).toFixed(1)),
    inventory: Number((inventoryScore(qty) * W.inventory).toFixed(1)),
    brand: Number((brandScore(source, candidate) * W.brand).toFixed(1)),
  };
  const score = Number(Object.values(breakdown).reduce((a, b) => a + b, 0).toFixed(1));
  return {
    product: candidate,
    score,
    breakdown, // <-- causal, auditable
    inventoryQty: qty,
    trust,
    tags: buildTags(source, candidate, qty, trust),
  };
}

// intent = { maxPrice, cheaperThanSource, requireInStock } — a shopper goal.
export function recommend(source, candidates, inventoryMap, limit = 5, intent = {}) {
  let scored = candidates
    .filter((c) => c.category === source.category) // hard relevance gate
    .map((c) => scoreOne(source, c, inventoryMap.get(c._id.toString()) ?? 0));

  // ---- intent-aware substitution: shape the field to the shopper's goal ----
  if (intent.requireInStock) scored = scored.filter((s) => s.inventoryQty > 0);
  if (intent.maxPrice) {
    scored = scored.map((s) =>
      s.product.price <= intent.maxPrice ? { ...s, tags: [...s.tags, "Within Budget"] } : { ...s, score: s.score - 15 }
    );
  }
  if (intent.cheaperThanSource) {
    scored = scored.map((s) =>
      s.product.price < source.price ? { ...s, score: Math.min(s.score + 8, 100), tags: [...s.tags, "Cheaper Pick"] } : s
    );
  }

  // In-stock stays ahead of out-of-stock, then by score.
  scored.sort((a, b) => {
    const stock = Number(b.inventoryQty > 0) - Number(a.inventoryQty > 0);
    return stock !== 0 ? stock : b.score - a.score;
  });

  const top = scored.slice(0, limit);

  // ---- anti-filter-bubble: guarantee one honest, diverse discovery ----------
  // If everything we'd show is the same brand as the source, swap the weakest
  // pick for the best DIFFERENT-brand, in-stock option and label it honestly.
  const allSameBrand = top.length && top.every((s) => s.product.brand === source.brand);
  if (allSameBrand) {
    const discovery = scored.find(
      (s) => s.product.brand !== source.brand && s.inventoryQty > 0 && !top.includes(s)
    );
    if (discovery) {
      discovery.tags = [...discovery.tags, "Discovery"];
      discovery.serendipity = true;
      top[top.length - 1] = discovery;
    }
  }

  return top;
}

export default recommend;
