import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getAllAdmins,
  addAdmin,
  deleteAdmin,
  changePassword,
} from "../controllers/admin";
import {
  getDashboardData,
  getDeliveryHistory,
  getDeliveryTrends,
  getNonDeliveryReasons,
  debugDeliveryData,
} from "../controllers/dashboard";

const router = Router();

// Admin role middleware
const adminOnly = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }
  next();
};

// Apply auth middleware and admin check to all admin routes
router.use(authMiddleware as any);
router.use(adminOnly);

// Admin management routes
router.get("/admins", getAllAdmins as any);
router.post("/admins", addAdmin as any);
router.delete("/admins/:id", deleteAdmin as any);
router.put("/change-password", changePassword as any);

// Dashboard routes
router.get("/dashboard", getDashboardData as any);
router.get("/delivery-history/:clientId", getDeliveryHistory as any);
router.get("/delivery-trends", getDeliveryTrends as any);
router.get("/non-delivery-reasons", getNonDeliveryReasons as any);

// Debug route
router.get("/debug-deliveries", debugDeliveryData as any);

export const adminRouter = router;
