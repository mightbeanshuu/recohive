import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import errorHandler from "./middleware/errorHandler.js";
import productRoutes from "./routes/productRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

dotenv.config();

const app = express();

// Middleware
const allowedOrigins = process.env.CLIENT_ORIGIN?.split(",").map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : true }));
app.use(express.json());

// API routes consumed by the Vite frontend.
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Smart Recommendation Engine Backend Running",
  });
});

// Error Handler
app.use((req, res, next) => {
  res.status(404);
  next(new Error(`Route ${req.originalUrl} not found`));
});
app.use(errorHandler);

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

// Run a real listening server only in local/Render mode. On Vercel the
// serverless entry (api/index.js) imports `app` and connects the DB itself.
if (!process.env.VERCEL) {
  startServer().catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
  });
}

export default app;
