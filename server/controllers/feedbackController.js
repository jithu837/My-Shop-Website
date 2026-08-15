import Feedback from "../models/Feedback.js";
import Product from "../models/Product.js";

export const createFeedback = async (req, res) => {
  try {
    const { customerName, customerPhone, product, order, rating, message } = req.body;
    const feedback = await Feedback.create({ customerName, customerPhone, product, order, rating, message });

    if (product) {
      const p = await Product.findById(product);
      if (p) {
        const newCount = p.ratingCount + 1;
        const newAvg = (p.ratingAvg * p.ratingCount + rating) / newCount;
        p.ratingAvg = Math.round(newAvg * 10) / 10;
        p.ratingCount = newCount;
        await p.save();
      }
    }

    res.status(201).json(feedback);
  } catch (err) {
    res.status(400).json({ message: "Could not submit feedback", error: err.message });
  }
};

// Admin: list all feedback, most recent first
export const getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find().populate("product", "name").sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: "Could not load feedback", error: err.message });
  }
};
