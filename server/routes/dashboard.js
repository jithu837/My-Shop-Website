import express from "express";
import { getDashboardSummary, getRevenueGraph } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/summary", getDashboardSummary);
router.get("/revenue-graph", getRevenueGraph);

export default router;
