// shoppingAgent — an AI agent that shops the way a person asks.
//
// A shopper doesn't think in filters; they say "find me a cheaper milk that's
// still highly rated." This agent turns that plain-English goal into a strict
// intent object, which then drives the DETERMINISTIC recommendation engine.
// The AI never ranks anything — it only interprets the request. If Gemini
// isn't configured (or fails), a keyword parser handles it, so the agent
// always works.
//
//   "cheaper and in stock"  ->  { cheaperThanSource: true, requireInStock: true }
//   "under 30 rupees"       ->  { maxPrice: 30 }
//
// This is the AI-agent layer on top of an auditable core: reasoning at the
// edge, deterministic math at the center.

import { GoogleGenerativeAI } from "@google/generative-ai";

// Deterministic fallback: never leaves the agent dead without an API key.
export function parseIntentDeterministic(text = "") {
  const t = String(text).toLowerCase();
  const intent = {};
  if (/\bcheap|cheaper|less expensive|lower price|budget|save\b/.test(t)) intent.cheaperThanSource = true;
  if (/\bin ?stock|available|not out of stock\b/.test(t)) intent.requireInStock = true;
  const under = t.match(/(?:under|below|less than|max|upto|up to)\s*(?:₹|rs\.?|inr)?\s*(\d+)/);
  if (under) intent.maxPrice = Number(under[1]);
  return intent;
}

export function createShoppingAgent({ apiKey = process.env.GEMINI_API_KEY, model = "gemini-1.5-flash" } = {}) {
  const live = Boolean(apiKey);

  // Returns { intent, source } where source is "ai" or "deterministic".
  async function understand(text) {
    const fallback = parseIntentDeterministic(text);
    if (!live) return { intent: fallback, source: "deterministic" };

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const m = genAI.getGenerativeModel({ model });
      const prompt = `Convert this shopper request into a strict JSON intent for a product-substitution engine.
Allowed keys ONLY: cheaperThanSource (boolean), requireInStock (boolean), maxPrice (number in rupees).
Omit keys that don't apply. Respond with JSON only, no prose.
Request: "${String(text).slice(0, 200)}"`;
      const res = await m.generateContent(prompt);
      const raw = res.response.text().replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);
      // Whitelist keys — the model can only ever produce these, never a rank.
      const intent = {};
      if (parsed.cheaperThanSource === true) intent.cheaperThanSource = true;
      if (parsed.requireInStock === true) intent.requireInStock = true;
      if (Number(parsed.maxPrice) > 0) intent.maxPrice = Number(parsed.maxPrice);
      return { intent, source: "ai" };
    } catch {
      return { intent: fallback, source: "deterministic" }; // AI hiccup -> still works
    }
  }

  return { live, understand };
}
