import mongoose from "mongoose";

// Serverless-safe: reuse an existing connection instead of dialing on every
// cold start (Vercel functions are short-lived and would otherwise pile up
// connections against Atlas). readyState 1 = already connected.
let ready = null;
const dbConnect = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!ready) ready = mongoose.connect(process.env.MONGO_URI);
  try {
    await ready;
    console.log("DB connected successfully");
  } catch (error) {
    ready = null;
    console.error("DB connection failed:", error.message);
    throw error;
  }
};

export default dbConnect;
