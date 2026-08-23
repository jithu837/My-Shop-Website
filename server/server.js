import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import connectDB from "./config/db.js";
import { ensureAdminExists } from "./controllers/authController.js";
import { generalLimiter } from "./middleware/rateLimiters.js";

import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import feedbackRoutes from "./routes/feedback.js";
import dashboardRoutes from "./routes/dashboard.js";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "server/.env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), "../server/.env"),
].filter((candidate, index, array) => array.indexOf(candidate) === index);

dotenv.config({
  path: envCandidates.find((candidate) => fs.existsSync(candidate)),
});

const uploadPath = [
  path.resolve(process.cwd(), "uploads"),
  path.resolve(process.cwd(), "server/uploads"),
  path.resolve(process.cwd(), "../uploads"),
].find((candidate) => fs.existsSync(candidate)) || path.resolve(process.cwd(), "uploads");

const clientDistPath = [
  path.resolve(process.cwd(), "client/dist"),
  path.resolve(process.cwd(), "../client/dist"),
].find((candidate) => fs.existsSync(candidate)) || path.resolve(process.cwd(), "client/dist");

const app = express();

// Trust the first proxy hop (Render, Vercel, Nginx, etc.) so rate-limiting
// uses the real client IP instead of the proxy's internal address.
app.set("trust proxy", 1);

// Enable CORS for all frontends (Vercel deployments, localhost, custom domains)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json());
app.use("/uploads", express.static(uploadPath));

// Health endpoint — must be BEFORE rate limiters so it's never blocked
app.get("/api/health", (req, res) => res.json({ status: "ok", ts: Date.now() }));

// ─── Routes (generalLimiter: 200 req / 15 min per IP on all API routes) ───────
app.use("/api/products", generalLimiter, productRoutes);
app.use("/api/orders", generalLimiter, orderRoutes);
app.use("/api/feedback", generalLimiter, feedbackRoutes);
app.use("/api/dashboard", generalLimiter, dashboardRoutes);

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

// Fallback error handler (e.g. multer file-size/type errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    await ensureAdminExists();

    // ── Pre-warm MongoDB BEFORE accepting connections ──────────────────────
    // Cold MongoDB Atlas M0 can take 30-60s for the first query.
    // By running the warm-up HERE (before app.listen), the server only opens
    // to users AFTER the DB is warm — so the very first user request is fast.
    try {
      const { default: Product } = await import("./models/Product.js");
      await Product.find({ isActive: true }).select("_id name").lean().limit(1);
      console.log("[warm-up] MongoDB product query warmed");
    } catch (e) {
      console.log("[warm-up] Warning (non-fatal):", e.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);

      // ── Keep-alive self-ping ──────────────────────────────────────────────
      // Render's free tier spins down after ~15 min of inactivity.
      // Ping every 5 minutes to keep the server always warm.
      const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
      if (RENDER_URL) {
        const pingUrl = `${RENDER_URL}/api/health`;
        const keepAlive = setInterval(async () => {
          try {
            await fetch(pingUrl, { signal: AbortSignal.timeout(10_000) });
            console.log(`[keep-alive] pinged ${pingUrl}`);
          } catch {
            // network blip — ignore
          }
        }, 5 * 60 * 1000);

        process.on("SIGTERM", () => clearInterval(keepAlive));
        process.on("SIGINT",  () => clearInterval(keepAlive));
      }
    });
  })
  .catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  });
