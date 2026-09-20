import express from "express";
import cluster from "node:cluster";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import fs from "fs";
import os from "node:os";
import path from "path";
import connectDB from "./config/db.js";
import { generalLimiter } from "./middleware/rateLimiters.js";
import { emitNewOrder, emitOrderUpdate } from "./utils/orderStream.js";

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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(uploadPath, {
  maxAge: "30d",
  immutable: true,
}));

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
const configuredWorkers = Number.parseInt(process.env.CLUSTER_WORKERS || "1", 10);
const workerCount = Math.max(1, Math.min(configuredWorkers || 1, os.cpus().length));

if (cluster.isPrimary && workerCount > 1) {
  console.log(`[cluster] primary ${process.pid} starting ${workerCount} workers`);

  for (let index = 0; index < workerCount; index += 1) cluster.fork();

  cluster.on("message", (worker, message) => {
    if (!message?.type || !["new-order", "order-updated"].includes(message.type)) return;

    for (const target of Object.values(cluster.workers)) {
      if (target?.isConnected() && target.id !== message.sourceWorkerId) {
        target.send(message);
      }
    }
  });

  cluster.on("exit", (worker) => {
    console.warn(`[cluster] worker ${worker.process.pid} exited; restarting`);
    cluster.fork();
  });
} else {
  if (cluster.isWorker) {
    process.on("message", (message) => {
      if (message?.type === "new-order") emitNewOrder(message.order);
      if (message?.type === "order-updated") emitOrderUpdate(message.order);
    });
  }

  app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // ── Connect to DB & Warm-up AFTER binding to port ───────────────────────
  // We bind to the port first so Render's health checks pass immediately and 
  // the container isn't killed. Mongoose will buffer incoming requests until connected.
  connectDB()
    .then(async () => {
      try {
        const { default: Product } = await import("./models/Product.js");
        await Product.find({ isActive: true }).select("_id name").lean().limit(1);
        console.log("[warm-up] MongoDB product query warmed");
      } catch (e) {
        console.log("[warm-up] Warning (non-fatal):", e.message);
      }
    })
    .catch((error) => {
      console.error(`Server startup failed: ${error.message}`);
      // Don't process.exit here, let it try to recover or stay up for diagnostics
    });

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
}
