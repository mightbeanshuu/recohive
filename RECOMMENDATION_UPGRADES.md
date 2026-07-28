# Recohive — Recommendation Upgrades (2026)

Researched against how Amazon and Flipkart actually recommend (web survey,
Jul 2026), then scored /100 for (differentiation × usefulness × buildable on
Recohive's deterministic core × no-ML, agent/automation-first). Shipped the
90+ ones. No ML models are trained — the ranking stays deterministic and
auditable; AI is used only as an *agent/automation* layer at the edges.

## Shipped (all 90+)

### 1. Causal score breakdown — 93/100
Every recommendation now returns the exact point contribution of each factor
(category / price / rating / inventory / brand) as a waterfall. A human can
audit precisely why A beat B. Amazon's ranking is a black box; Recohive's is
line-item explainable. Deterministic, no ML.

### 2. AI shopping agent (plain-English → intent) — 92/100
A shopper says "cheaper milk that's still in stock"; an AI agent parses that
into a strict intent object that steers the deterministic engine. The agent
**never ranks** — it only interprets, and falls back to a keyword parser with
no API key. This is agentic commerce (WWW 2026 direction) without any trained
model: reasoning at the edge, deterministic math at the core.

### 3. Trust-weighted ratings — 90/100
Amazon's most-documented weakness is fake/bought reviews. Recohive dampens the
*influence* of implausibly high ratings (a 4.8★ item with almost no stock) so
they can't buy their way to #1 — while still showing the real rating. Never
touches category relevance. A pure honesty feature big-commerce lacks.

### 4. Intent-aware substitution — 91/100
Honors a real shopper goal when their pick is gone: budget ceiling, "cheaper",
or in-stock-only, with honest tags (Within Budget, Cheaper Pick). Flipkart
handles out-of-stock substitution poorly; this makes it the point of the engine.

### 5. Anti-filter-bubble discovery — 90/100
If every pick would be the same brand as the source, the engine guarantees one
honest, in-stock, different-brand "Discovery" so users aren't trapped in a
bubble — the exact trap the 2026 literature says winning recommenders avoid.

### Bonus: cold-start by attributes (inherent)
Because the score is 100% attribute-based, a brand-new product with zero
interaction history still ranks correctly — Amazon's item cold-start pain,
solved by construction.

## Considered, not shipped
- **Graph neural networks / collaborative filtering** — strong but ML-heavy;
  out of scope (this project is deterministic + agentic on purpose).
- **RAG over review corpus** — useful but needs a review dataset we don't have.
