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

// ─── Routes (generalLimiter: 200 req / 15 min per IP on all API routes) ───────
// Stricter per-action limiters (orders: 20, feedback: 10) are applied inside
// the individual route files directly on the POST handlers.
app.use("/api/products", generalLimiter, productRoutes);
app.use("/api/orders", generalLimiter, orderRoutes);
app.use("/api/feedback", generalLimiter, feedbackRoutes);
app.use("/api/dashboard", generalLimiter, dashboardRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

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
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  });
