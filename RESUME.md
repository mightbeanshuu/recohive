# RecoHive — Resume Description (verified 2026-07-28)

**Repo:** https://github.com/mightbeanshuu/recohive

## Resume bullets (current, verified against source)

**RECOHIVE — Explainable Product Recommendation Engine**
*MERN · MongoDB · Gemini API*

- Led a 4-member team to build a MERN recommendation service ranking substitute products by a transparent **0–100 scoring formula** (category, price similarity, rating, stock), keeping ranking deterministic and auditable while an LLM writes only the human-readable reason.
- Designed 10+ REST endpoints for catalog CRUD, inventory and analytics; cached recommendations in MongoDB to avoid redundant model calls.

## Facts these bullets rest on

| Claim | Source in repo |
|---|---|
| Deterministic 0–100 formula | `README.md`: `score = 40*categoryMatch + 20*priceSimilarity + 20*(rating/5) + 20*inStock` |
| LLM writes only the reason, never the ranking | `backend/src/services/` Gemini explanation layer with string fallback |
| 10+ REST endpoints | products CRUD (4), inventory (3), recommendations (2), analytics (1) — `backend/src/routes/` |
| Cached recommendation rows | `GET /api/recommendations/:productId` reads saved rows |
| Stack | React + Vite + MUI frontend; Node/Express/Mongoose backend; MongoDB Atlas |

## Claims deliberately NOT made (corrected 2026-07-28)
- **Removed "Redis caching tier"** — there is no Redis in this repo; caching is MongoDB-persisted recommendation rows.
- **Removed "sub-100 ms responses"** — never benchmarked.
- **Removed "10K+ products"** — the catalog is seeded demo data (`backend/seed/seed.js`), not a 10K-product corpus.
- **Removed "JWT authentication / RBAC"** — not implemented in this codebase.
