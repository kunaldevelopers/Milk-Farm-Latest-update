import { Router } from "express";
import {
  getById,
  getAll,
  create,
  update,
  remove,
  updateDeliveryStatus,
  getDashboardStats,
  getSalesHistory,
  getDetailedSales,
} from "../controllers/client";
import { debugDeliveryData } from "../controllers/dashboard";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware as any);

// Existing routes
router.get("/", getAll as any);
router.get("/:id", getById as any);
router.post("/", create as any);
router.put("/:id", update as any);
router.delete("/:id", remove as any);
router.put("/:id/delivery-status", updateDeliveryStatus as any);

// New dashboard routes
router.get("/stats/dashboard", getDashboardStats as any);
router.get("/stats/sales-history", getSalesHistory as any);
router.get("/stats/detailed-sales", getDetailedSales as any);
router.get("/stats/debug", debugDeliveryData as any);

export const clientRouter = router;
