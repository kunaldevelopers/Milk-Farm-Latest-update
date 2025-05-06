import { Router, Request, Response, NextFunction } from "express";
import {
  getById,
  getAll,
  create,
  update,
  remove,
  getAssignedClients,
  assignClient,
  removeAssignment,
  getByUserId,
  markClientDelivered,
  markClientUndelivered,
  selectShift,
  getSessionByDate,
  markClientDailyDelivered,
  markClientDailyUndelivered,
  updateAssignedClients,
  getAllAssignments,
} from "../controllers/staff";
import { authMiddleware } from "../middleware/auth";
import { StaffSession } from "../models/StaffSession";
import { Client } from "../models/Client";

const router = Router();

// Helper to wrap async handlers
const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Apply auth middleware properly using the correct express syntax
router.use(authMiddleware as any);

// Staff lookup routes - these should be first to avoid param conflicts
router.get("/user/:userId", asyncHandler(getByUserId));

// Base routes
router.get("/", asyncHandler(getAll));
router.post("/", asyncHandler(create));

// Staff member specific routes
router.get("/:id", asyncHandler(getById));
router.get("/:id/assigned-clients", asyncHandler(getAssignedClients));
router.put("/:id", asyncHandler(update));
router.delete("/:id", asyncHandler(remove));

// Client assignment routes
router.post("/assign", asyncHandler(assignClient));
router.post("/unassign", asyncHandler(removeAssignment));

// Shift selection routes
router.post("/:id/select-shift", asyncHandler(selectShift));
// Fix: Split into two routes instead of using optional parameter
router.get("/:id/session", asyncHandler(getSessionByDate)); // For today's session
router.get("/:id/session/:date", asyncHandler(getSessionByDate)); // For specific date

// New endpoint for updating assigned clients based on shift
router.post(
  "/:id/update-assigned-clients",
  asyncHandler(updateAssignedClients)
);

// Daily delivery status routes with shift functionality
router.post(
  "/:id/client/:clientId/daily-delivered",
  asyncHandler(markClientDailyDelivered)
);
router.post(
  "/:id/client/:clientId/daily-undelivered",
  asyncHandler(markClientDailyUndelivered)
);

// Legacy delivery status routes (keeping for backward compatibility)
router.post("/client/:id/delivered", asyncHandler(markClientDelivered));
router.post("/client/:id/undelivered", asyncHandler(markClientUndelivered));

// Select shift endpoint
router.post(
  "/select-shift",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { shift } = req.body;
      const staffId = (req as any).userId;

      await StaffSession.findOneAndUpdate(
        {
          staffId,
          date: { $gte: new Date().setHours(0, 0, 0, 0) },
        },
        { staffId, shift },
        { upsert: true }
      );

      res.status(200).json({ message: "Shift selected successfully", shift });
    } catch (error) {
      console.error("Error selecting shift:", error);
      res.status(500).json({ message: "Failed to select shift" });
    }
  })
);

// Get current shift endpoint
router.get(
  "/current-shift",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const staffId = (req as any).userId;
      const staffSession = await StaffSession.findOne({
        staffId,
        date: { $gte: new Date().setHours(0, 0, 0, 0) },
      });

      res.status(200).json({ shift: staffSession?.shift || null });
    } catch (error) {
      console.error("Error fetching current shift:", error);
      res.status(500).json({ message: "Failed to fetch current shift" });
    }
  })
);

// Get my clients endpoint
router.get(
  "/my-clients",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const staffId = (req as any).userId;

      const staffSession = await StaffSession.findOne({
        staffId,
        date: { $gte: new Date().setHours(0, 0, 0, 0) },
      });

      if (!staffSession || !staffSession.shift) {
        return res.status(400).json({ message: "Please select a shift first" });
      }

      const clients = await Client.find({
        assignedTo: staffId,
        timeShift: staffSession.shift,
      });

      res.status(200).json(clients);
    } catch (error) {
      console.error("Error fetching staff clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  })
);

// Add new route for getting all staff assignments in one request
router.get("/assignments/all", asyncHandler(getAllAssignments));

// Debug endpoint to check if routes are properly registered
router.get("/debug/routes", (req, res) => {
  console.log("[DEBUG] Routes check requested");

  // Create a simple map of registered routes
  const routes = [];

  // Use the internal _router object to get registered routes
  const stack = router.stack || [];
  stack.forEach((layer) => {
    if (layer.route) {
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods).map((m) =>
        m.toUpperCase()
      );
      routes.push({ path, methods });
    }
  });

  res.status(200).json({
    message: "Staff routes debug info",
    routes: routes,
    timestamp: new Date().toISOString(),
  });
});

export const staffRouter = router;
