import express from "express";
import { getDashboardSummary, getRevenueGraph } from "../controllers/dashboardController.js";
import { protectAdmin } from "../middleware/auth.js";

const router = express.Router();

router.use(protectAdmin);

router.get("/summary", getDashboardSummary);
router.get("/revenue-graph", getRevenueGraph);

export default router;

