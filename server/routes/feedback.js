import express from "express";
import { createFeedback, getAllFeedback } from "../controllers/feedbackController.js";
import { feedbackLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// feedbackLimiter: max 10 submissions per IP per 15 min — prevents fake review spam.
router.post("/", feedbackLimiter, createFeedback);
router.get("/", getAllFeedback);

export default router;
