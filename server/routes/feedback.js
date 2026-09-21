import express from "express";
import { createFeedback, getAllFeedback } from "../controllers/feedbackController.js";
import { feedbackLimiter } from "../middleware/rateLimiters.js";
import { protectAdmin } from "../middleware/auth.js";

const router = express.Router();

// feedbackLimiter: max 10 submissions per IP per 15 min — prevents fake review spam.
router.post("/", feedbackLimiter, createFeedback);
router.get("/", protectAdmin, getAllFeedback);

export default router;
