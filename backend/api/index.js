// Vercel serverless entry: ensure the DB is connected (cached), then hand the
// request to the same Express app the local/Render server uses.
import app from "../src/app.js";
import connectDB from "../src/config/db.js";

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: "database_unavailable" }));
  }
  return app(req, res);
}
