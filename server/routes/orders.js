import express from "express";
import {
  createOrder,
  confirmPayment,
  getOrderById,
  getOrdersByPhone,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = express.Router();

// Customer
router.post("/", createOrder);
router.get("/phone/:phone", getOrdersByPhone);
router.get("/:id", getOrderById);
router.patch("/:id/confirm-payment", confirmPayment);

// Admin (login removed — direct access)
router.get("/", getAllOrders);
router.patch("/:id/status", updateOrderStatus);

export default router;
