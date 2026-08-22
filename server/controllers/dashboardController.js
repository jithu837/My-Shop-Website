import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Feedback from "../models/Feedback.js";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getDashboardSummary = async (req, res) => {
  try {
    const today = startOfToday();
    const monthStart = startOfMonth();

    const [todayOrders, monthOrders, pending, delivered, cancelled, customers, products, feedbackDocs] =
      await Promise.all([
        Order.find({ createdAt: { $gte: today } }).lean(),
        Order.find({ createdAt: { $gte: monthStart } }).lean(),
        Order.countDocuments({ status: { $in: ["New", "Accepted", "Packed", "Dispatched"] } }),
        Order.countDocuments({ status: "Delivered" }),
        Order.countDocuments({ status: "Cancelled" }),
        Order.distinct("customerPhone"),
        Product.find().lean(),
        Feedback.find().lean(),
      ]);

    const todaySales = todayOrders.filter((o) => o.status !== "Cancelled").length;
    const todayCollection = todayOrders
      .filter((o) => o.paymentStatus === "Paid" || o.paymentMethod === "COD")
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + o.total, 0);

    const monthlyCollection = monthOrders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + o.total, 0);

    const uniqueCustomers = customers.filter(Boolean).length;

    const lowStock = products.filter((p) => p.stockGrams > 0 && p.stockGrams <= p.lowStockThresholdGrams);
    const outOfStock = products.filter((p) => p.stockGrams <= 0);

    const bestSelling = [...products].sort((a, b) => (b.soldGrams || 0) - (a.soldGrams || 0)).slice(0, 5);
    const leastSelling = [...products].sort((a, b) => (a.soldGrams || 0) - (b.soldGrams || 0)).slice(0, 5);

    const avgRating = feedbackDocs.length
      ? Math.round((feedbackDocs.reduce((s, f) => s + f.rating, 0) / feedbackDocs.length) * 10) / 10
      : 0;

    res.json({
      todaySalesCount: todaySales,
      todayCollection,
      monthlyCollection,
      pendingOrders: pending,
      deliveredOrders: delivered,
      cancelledOrders: cancelled,
      totalCustomers: uniqueCustomers,
      lowStockProducts: lowStock,
      outOfStockProducts: outOfStock,
      bestSelling,
      leastSelling,
      feedbackCount: feedbackDocs.length,
      avgRating,
    });
  } catch (err) {
    res.status(500).json({ message: "Could not load dashboard", error: err.message });
  }
};

// Revenue graph: last 7 days of collection, for daily/weekly view
export const getRevenueGraph = async (req, res) => {
  try {
    const from = daysAgo(6);
    const orders = await Order.find({ createdAt: { $gte: from }, status: { $ne: "Cancelled" } }).select("createdAt total").lean();

    const buckets = {};
    for (let i = 6; i >= 0; i--) {
      const d = daysAgo(i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }

    orders.forEach((o) => {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (buckets[key] !== undefined) buckets[key] += o.total;
    });

    res.json(Object.entries(buckets).map(([date, total]) => ({ date, total })));
  } catch (err) {
    res.status(500).json({ message: "Could not load revenue graph", error: err.message });
  }
};
