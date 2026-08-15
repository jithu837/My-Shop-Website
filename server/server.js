import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./config/db.js";
import { ensureAdminExists } from "./controllers/authController.js";

import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import feedbackRoutes from "./routes/feedback.js";
import dashboardRoutes from "./routes/dashboard.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Fallback error handler (e.g. multer file-size/type errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await ensureAdminExists();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
