import express from "express";
import {
  createOrder,
  confirmPayment,
  getOrderById,
  getOrdersByPhone,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { orderLimiter } from "../middleware/rateLimiters.js";
import { addClient, removeClient } from "../utils/orderStream.js";

const router = express.Router();

// Admin (login removed — direct access)
// IMPORTANT: GET "/" must come BEFORE GET "/:id" or Express will never reach it.
router.get("/", getAllOrders);
router.patch("/:id/status", updateOrderStatus);

// ── SSE stream — admin panels subscribe here for real-time order alerts ──────
// Must be registered BEFORE "/:id" so "stream" isn't treated as a MongoDB ID.
router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Disable Nginx/Render proxy buffering so events arrive immediately.
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send an opening comment so the browser knows the connection is live.
  res.write(": connected\n\n");

  // Heartbeat every 25 s — keeps the connection alive through proxies that
  // close idle streams (Render's load balancer times out at ~60 s).
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  addClient(res);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});

// Customer
// orderLimiter: max 20 new orders per IP per 15 min — prevents checkout spam.
router.post("/", orderLimiter, createOrder);
router.get("/phone/:phone", getOrdersByPhone);
router.get("/:id", getOrderById);
// Also limit payment confirmations to close the loop on UPI spoofing attempts.
router.patch("/:id/confirm-payment", orderLimiter, confirmPayment);

export default router;

