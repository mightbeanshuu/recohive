const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  // Shared fetch wrapper keeps frontend/backend errors consistent.
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "API request failed");
  }

  return payload;
}

export const api = {
  listProducts: () => request("/products").then((payload) => payload.data || []),
  createProduct: (product) =>
    request("/products", { method: "POST", body: JSON.stringify(product) }).then((payload) => payload.data),
  updateProduct: (id, product) =>
    request(`/products/${id}`, { method: "PUT", body: JSON.stringify(product) }).then((payload) => payload.data),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),

  listInventory: () => request("/inventory").then((payload) => payload.data || []),
  createInventory: (inventory) =>
    request("/inventory", { method: "POST", body: JSON.stringify(inventory) }).then((payload) => payload.data),
  updateInventory: (id, inventory) =>
    request(`/inventory/${id}`, { method: "PUT", body: JSON.stringify(inventory) }).then((payload) => payload.data),

  // query is an optional plain-English goal the AI agent parses into intent.
  // Returns the full payload so the UI can show the agent's parsed intent too.
  generateRecommendations: (productId, query) =>
    request("/recommendations/generate-recommendations", {
      method: "POST",
      body: JSON.stringify({ productId, ...(query ? { query } : {}) }),
    }).then((payload) => ({ recommendations: payload.recommendations || [], agent: payload.agent || { used: false } })),
  topRecommended: () => request("/analytics/top-recommended").then((payload) => payload.data || []),
};

export { API_BASE_URL };
