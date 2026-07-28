import { useEffect, useMemo, useState } from "react";
import { Box, Typography, Button, Container, Dialog, DialogContent, IconButton, InputBase } from "@mui/material";
import { Star, X, Cpu, Zap, Search, Sparkles } from "lucide-react";
import { api } from "./api";

// Causal score breakdown: the per-factor points that sum to the 0-100 score,
// shown as a stacked bar so a human can audit exactly why this item ranked.
const FACTOR_META = {
  category: { label: "Category", color: "var(--accent-green)" },
  price: { label: "Price", color: "#38bdf8" },
  rating: { label: "Rating", color: "#a78bfa" },
  inventory: { label: "Stock", color: "#fbbf24" },
  brand: { label: "Brand", color: "#f472b6" },
};

function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null;
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0);
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", mb: 0.5 }}>
        {entries.map(([k, v]) => (
          <Box key={k} title={`${FACTOR_META[k]?.label ?? k}: ${v}`} sx={{ width: `${v}%`, bgcolor: FACTOR_META[k]?.color ?? "#888" }} />
        ))}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {entries.map(([k, v]) => (
          <Typography key={k} sx={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 0.4 }}>
            <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: FACTOR_META[k]?.color ?? "#888" }} />
            {FACTOR_META[k]?.label ?? k} {v}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function productImage(productName) {
  const label = encodeURIComponent((productName || "PRODUCT").slice(0, 20).toUpperCase());
  return `https://placehold.co/320x240/121212/a1a1aa?text=${label}`;
}

function cartProduct(product) {
  return {
    id: product._id,
    name: product.productName,
    brand: product.brand,
    category: product.category,
    price: product.price,
    rating: product.rating,
    image: product.image || productImage(product.productName),
  };
}

export default function CustomerShopping({ addToCart }) {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [agent, setAgent] = useState({ used: false });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState({ loading: true, error: "", recommending: false });

  const inventoryByProductId = useMemo(
    () => new Map(inventory.map((item) => [item.productId?._id || item.productId, item])),
    [inventory]
  );

  const storefrontProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        stock: inventoryByProductId.get(product._id)?.availableQuantity ?? 0,
        image: productImage(product.productName),
      })),
    [products, inventoryByProductId]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productRows, inventoryRows] = await Promise.all([api.listProducts(), api.listInventory()]);
        setProducts(productRows);
        setInventory(inventoryRows);
        setStatus({ loading: false, error: "", recommending: false });
      } catch (error) {
        setStatus({ loading: false, error: error.message, recommending: false });
      }
    };

    loadData();
  }, []);

  const runRecommend = async (product, goal) => {
    setStatus((prev) => ({ ...prev, recommending: true, error: "" }));
    try {
      // The backend ranks deterministically; an optional goal is parsed by the
      // AI agent into intent that steers the ranking.
      const { recommendations: rows, agent: agentInfo } = await api.generateRecommendations(product._id, goal);
      setRecommendations(rows);
      setAgent(agentInfo);
      setStatus((prev) => ({ ...prev, recommending: false }));
    } catch (error) {
      setStatus({ loading: false, error: error.message, recommending: false });
    }
  };

  const handleProductClick = async (product) => {
    setSelectedProduct(product);
    setRecommendations([]);
    setAgent({ used: false });
    setQuery("");
    runRecommend(product);
  };

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 4, md: 8 }, color: "var(--text-primary)" }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 6, maxWidth: 600 }}>
          <Typography sx={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-tertiary)", letterSpacing: "0.3em", mb: 1, textTransform: "uppercase" }}>
            Customer Access Node
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 300, letterSpacing: "-0.05em", mb: 2, display: "flex", alignItems: "center" }}>
            Storefront<span className="blink" style={{ color: "var(--text-tertiary)", marginLeft: "4px" }}>_</span>
          </Typography>
          <Typography sx={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 300, lineHeight: 1.6 }}>
            Browse live products and generate backend-ranked substitutions.
          </Typography>
        </Box>

        {status.error && (
          <Box sx={{ mb: 3, p: 2, border: "1px solid var(--accent-red)", color: "var(--accent-red)", fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
            &gt; {status.error}
          </Box>
        )}

        {status.loading ? (
          <Box sx={{ p: 6, textAlign: "center", border: "1px solid var(--border)", bgcolor: "var(--bg-panel)", fontFamily: "var(--mono)", color: "var(--text-tertiary)" }}>
            &gt; LOADING_STOREFRONT
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" }, gap: 3 }}>
            {storefrontProducts.map((product) => (
              <Box key={product._id} onClick={() => handleProductClick(product)} className="hud-box hud-box-tl hud-box-tr hud-box-bl hud-box-br" sx={{ border: "1px solid var(--border)", bgcolor: "var(--bg-panel)", display: "flex", flexDirection: "column", cursor: "pointer", transition: "all 0.2s", "&:hover": { borderColor: "var(--text-primary)", transform: "translateY(-2px)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" } }}>
                <Box sx={{ height: 160, backgroundImage: `url(${product.image})`, backgroundSize: "cover", backgroundPosition: "center", borderBottom: "1px solid var(--border)", filter: "grayscale(100%) contrast(1.2)" }} />
                <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Typography sx={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-tertiary)", letterSpacing: "0.1em", mb: 0.5, textTransform: "uppercase" }}>
                    {product.category} · {product.stock > 0 ? `${product.stock} in stock` : "out of stock"}
                  </Typography>
                  <Typography sx={{ fontSize: "1rem", fontWeight: 500, letterSpacing: "0.03em", mb: 2 }}>{product.productName}</Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mt: "auto" }}>
                    <Typography sx={{ fontFamily: "var(--mono)", fontSize: "1.25rem", fontWeight: 700 }}>₹{product.price}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Star size={12} color="var(--accent-green)" fill="var(--accent-green)" />
                      <Typography sx={{ fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{product.rating}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Container>

      <Dialog open={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 0, color: "var(--text-primary)" } }}>
        {selectedProduct && (
          <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderBottom: "1px solid var(--border)", bgcolor: "var(--bg-panel-light)" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Cpu size={16} color="var(--text-tertiary)" />
                <Typography sx={{ fontFamily: "var(--mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                  RECOMMENDATION_ENGINE // BACKEND
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedProduct(null)} sx={{ color: "var(--text-secondary)" }}>
                <X size={18} />
              </IconButton>
            </Box>

            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
              <Box sx={{ flex: 1, p: 3, borderRight: { md: "1px solid var(--border)" }, borderBottom: { xs: "1px solid var(--border)", md: "none" } }}>
                <Typography sx={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-tertiary)", letterSpacing: "0.1em", mb: 2 }}>[ TARGET_SELECTION ]</Typography>
                <Box sx={{ height: 200, backgroundImage: `url(${selectedProduct.image})`, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid var(--border)", mb: 3, filter: "grayscale(100%)" }} />
                <Typography variant="h5" sx={{ mb: 1 }}>{selectedProduct.productName}</Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                  <Typography sx={{ fontFamily: "var(--mono)", fontSize: "1.5rem", fontWeight: 700 }}>₹{selectedProduct.price}</Typography>
                  <Typography sx={{ fontFamily: "var(--mono)", fontSize: "1rem", color: "var(--text-secondary)" }}>{selectedProduct.rating} rating</Typography>
                </Box>
                <Button fullWidth onClick={() => { addToCart(cartProduct(selectedProduct)); setSelectedProduct(null); }} sx={{ bgcolor: "var(--bg-panel-light)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 0, py: 1.5, fontFamily: "var(--mono)", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
                  &gt; ADD_TARGET_TO_CART
                </Button>
              </Box>

              <Box sx={{ flex: 1.5, p: 3, bgcolor: "var(--bg-base)" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <Zap size={16} color="var(--accent-green)" />
                  <Typography sx={{ fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--accent-green)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                    OPTIMIZED_ALTERNATIVES
                  </Typography>
                </Box>

                {/* AI shopping agent: type a plain-English goal, it steers the ranking */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, border: "1px solid var(--border)", bgcolor: "var(--bg-panel)", px: 1.5, py: 0.5, mb: 1 }}>
                  <Search size={14} color="var(--text-tertiary)" />
                  <InputBase
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") runRecommend(selectedProduct, query); }}
                    placeholder="ask the agent: cheaper but in stock…"
                    sx={{ flex: 1, fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-primary)" }}
                  />
                  <Button size="small" onClick={() => runRecommend(selectedProduct, query)} sx={{ minWidth: 0, color: "var(--accent-green)", fontFamily: "var(--mono)", fontSize: "0.65rem" }}>ASK</Button>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2 }}>
                  {["cheaper", "in stock", "under 30"].map((chip) => (
                    <Box key={chip} onClick={() => { setQuery(chip); runRecommend(selectedProduct, chip); }} sx={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-secondary)", border: "1px solid var(--border)", px: 1, py: 0.4, "&:hover": { borderColor: "var(--accent-green)", color: "var(--accent-green)" } }}>
                      {chip}
                    </Box>
                  ))}
                </Box>
                {agent.used && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2, fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-tertiary)" }}>
                    <Sparkles size={12} color="#a78bfa" />
                    agent [{agent.source}] read: {Object.keys(agent.intent || {}).length ? JSON.stringify(agent.intent) : "no constraints"}
                  </Box>
                )}

                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {status.recommending ? (
                    <Typography sx={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>&gt; GENERATING_RECOMMENDATIONS</Typography>
                  ) : recommendations.length > 0 ? (
                    recommendations.map((rec) => {
                      const product = rec.recommendedProductId;
                      return (
                        <Box key={rec._id} sx={{ display: "flex", gap: 2 }}>
                          <Box sx={{ width: 80, height: 80, backgroundImage: `url(${productImage(product.productName)})`, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid var(--border)", filter: "grayscale(100%) contrast(1.2)" }} />
                          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                              <Typography sx={{ fontWeight: 500, fontSize: "0.9rem", mb: 0.5 }}>{product.productName}</Typography>
                              <Typography sx={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-green)" }}>{rec.recommendationScore}/100</Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                              <Typography sx={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                                ₹{product.price} · {product.rating} rating
                              </Typography>
                              {rec.serendipity && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, fontFamily: "var(--mono)", fontSize: "0.55rem", color: "#f472b6", border: "1px solid #f472b6", px: 0.75, py: 0.2 }}>
                                  <Sparkles size={10} /> DISCOVERY
                                </Box>
                              )}
                            </Box>
                            <ScoreBreakdown breakdown={rec.breakdown} />
                            <Box sx={{ p: 1.5, bgcolor: "rgba(16, 185, 129, 0.05)", borderLeft: "2px solid var(--accent-green)", fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-secondary)", mb: 1.5, lineHeight: 1.5 }}>
                              &gt; {rec.reason}
                            </Box>
                            <Button size="small" onClick={() => { addToCart(cartProduct(product)); setSelectedProduct(null); }} sx={{ alignSelf: "flex-start", color: "var(--bg-base)", bgcolor: "var(--accent-green)", borderRadius: 0, px: 2, py: 0.5, fontFamily: "var(--mono)", fontSize: "0.65rem", letterSpacing: "0.1em" }}>
                              + ADD_ALTERNATIVE
                            </Button>
                          </Box>
                        </Box>
                      );
                    })
                  ) : (
                    <Typography sx={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>&gt; NO_ALTERNATIVES_FOUND</Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
}
