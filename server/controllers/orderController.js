import Order from "../models/Order.js";
import Product from "../models/Product.js";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { emitNewOrder, emitOrderUpdate } from "../utils/orderStream.js";

const getRazorpayKeys = () => {
  let key_id = process.env.RAZORPAY_KEY_ID;
  let key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || key_id === "rzp_live_TNlvVhOpmeyCHP" || key_id === "rzp_live_Te0OeStHnJXmrQ") {
    key_id = "rzp_live_TeNmwwXU1U2ANK";
  }
  if (!key_secret || key_secret === "tei6eatNhyc7qYlRkdTD3wBJ" || key_secret === "cJAddNinA91W9cYOzosmRY5L") {
    key_secret = "fqu3NQ6nv7ACIsUzMyS4BeE6";
  }
  return { key_id, key_secret };
};

const getRazorpay = () => {
  const { key_id, key_secret } = getRazorpayKeys();
  if (!key_id || !key_secret) return null;
  return new Razorpay({
    key_id,
    key_secret,
  });
};

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

    // Calculate today's start in IST (midnight 00:00 IST) for daily token resets
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const year = istNow.getUTCFullYear();
    const month = istNow.getUTCMonth();
    const date = istNow.getUTCDate();
    const startOfDayUTC = new Date(Date.UTC(year, month, date) - istOffsetMs);

    const yy = String(year).slice(-2);
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(date).padStart(2, "0");
    const dateCode = `${yy}${mm}${dd}`;

    // Count today's orders to start tokens from 1 each day
    const todayOrdersCount = await Order.countDocuments({
      createdAt: { $gte: startOfDayUTC },
    });

    let dailyToken = todayOrdersCount + 1;
    while (true) {
      const existing = await Order.findOne({
        createdAt: { $gte: startOfDayUTC },
        tokenNumber: dailyToken,
      });
      if (!existing) break;
      dailyToken++;
    }

    // Globally unique orderNumber format: CH-YYMMDD-TOKEN (e.g. CH-260920-1)
    let orderNumberStr = `CH-${dateCode}-${dailyToken}`;
    while (true) {
      const existingNum = await Order.findOne({ orderNumber: orderNumberStr });
      if (!existingNum) break;
      dailyToken++;
      orderNumberStr = `CH-${dateCode}-${dailyToken}`;
    }

    const order = await Order.create({
      orderNumber: orderNumberStr,
      tokenNumber: dailyToken,
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
      paymentMethod:
        paymentMethod === "Razorpay"
          ? "Razorpay"
          : paymentMethod === "UPI"
            ? "UPI"
            : type === "Counter"
              ? "Cash"
              : "COD",
      paymentStatus: "Pending",
    });

    let razorpayOrder = null;
    if (paymentMethod === "Razorpay") {
      const razorpay = getRazorpay();
      if (!razorpay) {
        return res.status(503).json({ message: "Razorpay is not configured on the server" });
      }
      razorpayOrder = await razorpay.orders.create({
        amount: total * 100,
        currency: "INR",
        receipt: `order_${order.orderNumber}`,
        notes: { orderId: order._id.toString() },
      });
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
    }

    // Push real-time notification to every connected admin tab.
    emitNewOrder(order);
    if (process.send) {
      process.send({
        type: "new-order",
        order,
        sourceWorkerId: process.env.NODE_UNIQUE_ID ? Number(process.env.NODE_UNIQUE_ID) : undefined,
      });
    }

    res.status(201).json({
      ...order.toObject(),
      razorpayOrder,
      razorpayKeyId: getRazorpayKeys().key_id,
    });
  } catch (err) {
    res.status(500).json({ message: "Could not place order", error: err.message });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Incomplete Razorpay payment details" });
    }

    const order = await Order.findById(orderId);
    if (!order || order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ message: "Payment order could not be matched" });
    }

    const { key_secret } = getRazorpayKeys();
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const valid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpaySignature)
    );
    if (!valid) return res.status(400).json({ message: "Invalid payment signature" });

    order.paymentStatus = "Paid";
    order.razorpayPaymentId = razorpayPaymentId;
    await order.save();
    emitOrderUpdate(order);
    if (process.send) process.send({ type: "order-updated", order });
    res.json({ message: "Payment verified", order });
  } catch (err) {
    res.status(500).json({ message: "Could not verify payment", error: err.message });
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
    emitOrderUpdate(order);
    if (process.send) process.send({ type: "order-updated", order });
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

// Admin: list all orders, optionally filtered by status and sorted (asc for FIFO, desc for LIFO)
export const getAllOrders = async (req, res) => {
  try {
    const { status, orderType, sort } = req.query;
    const filter = {};
    if (status && status !== "All") filter.status = status;
    if (orderType && orderType !== "All") filter.orderType = orderType;
    const sortOrder = sort === "asc" ? 1 : -1;
    const orders = await Order.find(filter).sort({ createdAt: sortOrder }).lean();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Could not load orders", error: err.message });
  }
};

// Admin: customer purchase history and statistics
export const getCustomerHistory = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();

    const customerMap = new Map();

    for (const order of orders) {
      const rawPhone = (order.customerPhone || "").trim();
      const rawName = (order.customerName || "Walk-in Customer").trim();
      // Group by normalized phone number, or by guest name if no phone
      const key = rawPhone && rawPhone.length >= 7 ? rawPhone : `walkin_${rawName.toLowerCase()}`;

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: key,
          customerName: rawName,
          customerPhone: rawPhone,
          customerAddress: order.customerAddress || "",
          customerEmail: order.customerEmail || "",
          totalOrders: 0,
          totalSpent: 0,
          firstOrderAt: order.createdAt,
          lastOrderAt: order.createdAt,
          orders: [],
          itemsMap: {},
        });
      }

      const cust = customerMap.get(key);
      cust.totalOrders += 1;
      cust.totalSpent += Number(order.total) || 0;

      if (new Date(order.createdAt) > new Date(cust.lastOrderAt)) {
        cust.lastOrderAt = order.createdAt;
      }
      if (new Date(order.createdAt) < new Date(cust.firstOrderAt)) {
        cust.firstOrderAt = order.createdAt;
      }
      if (rawName !== "Walk-in Customer" && (!cust.customerName || cust.customerName === "Walk-in Customer")) {
        cust.customerName = rawName;
      }
      if (order.customerAddress && !cust.customerAddress) {
        cust.customerAddress = order.customerAddress;
      }
      if (order.customerEmail && !cust.customerEmail) {
        cust.customerEmail = order.customerEmail;
      }

      // Aggregate items bought
      if (Array.isArray(order.items)) {
        for (const it of order.items) {
          const itemName = it.name || "Item";
          if (!cust.itemsMap[itemName]) {
            cust.itemsMap[itemName] = {
              name: itemName,
              totalGrams: 0,
              orderCount: 0,
              totalAmount: 0,
            };
          }
          cust.itemsMap[itemName].totalGrams += Number(it.grams) || 0;
          cust.itemsMap[itemName].orderCount += 1;
          cust.itemsMap[itemName].totalAmount += Number(it.lineTotal) || 0;
        }
      }

      cust.orders.push({
        _id: order._id,
        orderNumber: order.orderNumber,
        tokenNumber: order.tokenNumber,
        orderType: order.orderType,
        items: order.items,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        createdAt: order.createdAt,
      });
    }

    const customers = Array.from(customerMap.values()).map((c) => {
      const itemsList = Object.values(c.itemsMap).sort((a, b) => b.totalGrams - a.totalGrams);
      delete c.itemsMap;
      return {
        ...c,
        purchasedItems: itemsList,
      };
    });

    // Sort by latest order date
    customers.sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt));

    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: "Could not load customer history", error: err.message });
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
    emitOrderUpdate(order);
    if (process.send) process.send({ type: "order-updated", order });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Could not update order", error: err.message });
  }
};
