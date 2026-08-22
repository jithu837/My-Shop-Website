import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { emitNewOrder } from "../utils/orderStream.js";

// Customer: place a new order. Validates stock, deducts it, computes totals
// server-side (never trusts prices sent from the browser).
export const createOrder = async (req, res) => {
  try {
    const { customerName, customerPhone, customerAddress, customerEmail, items, paymentMethod, couponCode, orderType } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const type = orderType === "Counter" ? "Counter" : "Delivery";

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `${item.name || "A product"} is no longer available` });
      }
      if (product.stockGrams < item.grams) {
        return res.status(400).json({ message: `${product.name} only has ${product.stockGrams}g left in stock` });
      }

      const effectivePricePerKg = product.pricePerKg * (1 - (product.offerPercent || 0) / 100);
      const lineTotal = Math.round((effectivePricePerKg * item.grams) / 1000);

      orderItems.push({
        product: product._id,
        name: product.name,
        grams: item.grams,
        pricePerKg: product.pricePerKg,
        lineTotal,
      });

      subtotal += lineTotal;

      product.stockGrams -= item.grams;
      product.soldGrams = (product.soldGrams || 0) + item.grams;
      await product.save();
    }

    // Simple coupon logic - flat codes can be extended later from the DB
    let discount = 0;
    if (couponCode && couponCode.toUpperCase() === "SWEET10") {
      discount = Math.round(subtotal * 0.1);
    }

    const total = subtotal - discount;

    // Generate sequential order number starting from 1
    let count = await Order.countDocuments();
    let nextId = count + 1;
    while(true) {
        const existing = await Order.findOne({ orderNumber: nextId.toString() });
        if (!existing) break;
        nextId++;
    }
    const orderNumberStr = nextId.toString();

    const order = await Order.create({
      orderNumber: orderNumberStr,
      orderType: type,
      customerName: customerName || "Walk-in Customer",
      customerPhone: customerPhone || "",
      customerAddress: customerAddress || "",
      customerEmail,
      items: orderItems,
      subtotal,
      couponCode: couponCode || "",
      discount,
      total,
      paymentMethod,
      paymentStatus: "Pending",
    });

    // Push real-time notification to every connected admin tab.
    emitNewOrder(order);

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: "Could not place order", error: err.message });
  }
};

// Customer: mark a UPI order as paid after they confirm payment in their app.
// (No payment gateway is connected, so this is a manual customer confirmation
// step - the owner does final verification from the admin panel.)
export const confirmPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    order.paymentStatus = "Paid";
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Could not confirm payment", error: err.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Could not load order", error: err.message });
  }
};

// Customer: order history by phone number (no separate login system required)
export const getOrdersByPhone = async (req, res) => {
  try {
    const orders = await Order.find({ customerPhone: req.params.phone }).sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Could not load orders", error: err.message });
  }
};

// Admin: list all orders, optionally filtered by status
export const getAllOrders = async (req, res) => {
  try {
    const { status, orderType } = req.query;
    const filter = {};
    if (status && status !== "All") filter.status = status;
    if (orderType && orderType !== "All") filter.orderType = orderType;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Could not load orders", error: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Could not update order", error: err.message });
  }
};
