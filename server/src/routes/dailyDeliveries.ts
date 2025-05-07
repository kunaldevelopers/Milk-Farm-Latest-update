import { Router, Request, Response, NextFunction } from "express";
import { DailyDelivery } from "../models/DailyDelivery";
import { StaffSession } from "../models/StaffSession";
import { authMiddleware } from "../middleware/auth";
import { Client } from "../models/Client";
import { Staff } from "../models/Staff";
import mongoose from "mongoose";

const router = Router();

// Helper to wrap async handlers
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Apply auth middleware to all routes
// Fix: Create a wrapper function that TypeScript can recognize as a proper middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  authMiddleware(req, res, next);
});

// Get all deliveries for a specific date, optionally filtered by shift
router.get(
  "/:date",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const dateParam = req.params.date;
      const { shift } = req.query;

      // Parse the date, defaulting to today if invalid
      let date: Date;
      try {
        date = new Date(dateParam);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
          throw new Error("Invalid date");
        }
      } catch {
        date = new Date();
      }

      // Set time to midnight for consistent comparison
      date.setHours(0, 0, 0, 0);

      // Build the query
      const query: any = { date };
      if (shift && ["AM", "PM"].includes(shift as string)) {
        query.shift = shift;
      }

      // Fetch the deliveries with populated client and staff data
      const dailyDeliveries = await DailyDelivery.find(query)
        .populate({
          path: "clientId",
          select: "name number location timeShift quantity pricePerLitre",
        })
        .populate({
          path: "staffId",
          select: "name shift contactNumber",
        });

      console.log(
        `Fetched ${dailyDeliveries.length} deliveries for ${
          date.toISOString().split("T")[0]
        }${shift ? `, shift: ${shift}` : ""}`
      );

      res.json(dailyDeliveries);
    } catch (error) {
      console.error("Error fetching daily deliveries:", error);
      res.status(500).json({
        message: "Error fetching daily deliveries",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

// Get staff's deliveries for a specific date, filtered by their selected shift
router.get(
  "/staff/:staffId/:date",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { staffId, date: dateParam } = req.params;

      if (!mongoose.Types.ObjectId.isValid(staffId)) {
        return res.status(400).json({ message: "Invalid staff ID format" });
      }

      // Parse the date, defaulting to today if invalid
      let date: Date;
      try {
        date = new Date(dateParam);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
          throw new Error("Invalid date");
        }
      } catch {
        date = new Date();
      }

      // Set time to midnight for consistent comparison
      date.setHours(0, 0, 0, 0);

      // Get the staff's selected shift for this date
      const staffSession = await StaffSession.findOne({ staffId, date });

      // Get staff member record
      const staffMember = await Staff.findById(staffId).populate({
        path: "assignedClients",
        match: { timeShift: { $exists: true } },
        select:
          "name number location timeShift quantity pricePerLitre deliveryStatus deliveryNotes",
      });

      if (!staffMember) {
        return res.status(404).json({ message: "Staff not found" });
      }

      // If no shift selected, return available shifts with their clients
      if (!staffSession) {
        const clientsByShift = {
          AM: (staffMember.assignedClients as any[]).filter(
            (client) => client.timeShift === "AM"
          ),
          PM: (staffMember.assignedClients as any[]).filter(
            (client) => client.timeShift === "PM"
          ),
        };

        return res.status(400).json({
          message: "No shift selected for this date",
          clientsByShift,
          requireShiftSelection: true,
        });
      }

      // Find clients that match the staff's selected shift
      const clients = await Client.find({
        _id: { $in: staffMember.assignedClients },
        timeShift: staffSession.shift,
      });

      // Find or create delivery records for each client
      const deliveries = await Promise.all(
        clients.map(async (client) => {
          let delivery = await DailyDelivery.findOne({
            clientId: client._id,
            staffId,
            date,
            shift: staffSession.shift,
          });

          if (!delivery) {
            delivery = new DailyDelivery({
              clientId: client._id,
              staffId,
              date,
              shift: staffSession.shift,
              deliveryStatus: client.deliveryStatus || "Pending",
              quantity: 0,
              price: 0,
            });
            await delivery.save();
          }

          return {
            _id: delivery._id,
            clientId: client,
            staffId,
            date,
            shift: staffSession.shift,
            deliveryStatus: delivery.deliveryStatus,
            quantity: delivery.quantity,
            price: delivery.price,
          };
        })
      );

      res.json({
        shift: staffSession.shift,
        deliveries,
      });
    } catch (error) {
      console.error("Error fetching daily deliveries:", error);
      res.status(500).json({
        message: "Error fetching daily deliveries",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

// Generate daily delivery statistics
router.get(
  "/stats/:date",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const dateParam = req.params.date;
      const { shift } = req.query;

      // Parse the date, defaulting to today if invalid
      let date: Date;
      try {
        date = new Date(dateParam);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
          throw new Error("Invalid date");
        }
      } catch {
        date = new Date();
      }

      // Set time to midnight for consistent comparison
      date.setHours(0, 0, 0, 0);

      // Build the query
      const query: any = { date };
      if (shift && ["AM", "PM"].includes(shift as string)) {
        query.shift = shift;
      }

      // Get total deliveries and statistics
      const [deliveries, totalDelivered, totalNotDelivered] = await Promise.all(
        [
          DailyDelivery.find(query),
          DailyDelivery.countDocuments({
            ...query,
            deliveryStatus: "Delivered",
          }),
          DailyDelivery.countDocuments({
            ...query,
            deliveryStatus: "Not Delivered",
          }),
        ]
      );

      // Calculate quantities and revenue
      const totalQuantity = deliveries.reduce(
        (sum, delivery) => sum + delivery.quantity,
        0
      );
      const totalRevenue = deliveries.reduce(
        (sum, delivery) => sum + delivery.price,
        0
      );

      const stats = {
        date: date.toISOString().split("T")[0],
        shift: shift || "All",
        totalDeliveries: deliveries.length,
        totalDelivered,
        totalNotDelivered,
        totalQuantity,
        totalRevenue,
        deliveryPercentage: deliveries.length
          ? (totalDelivered / deliveries.length) * 100
          : 0,
      };

      console.log(
        `Generated stats for ${date.toISOString().split("T")[0]}${
          shift ? `, shift: ${shift}` : ""
        }`
      );

      res.json(stats);
    } catch (error) {
      console.error("Error generating daily delivery stats:", error);
      res.status(500).json({
        message: "Error generating statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

export const dailyDeliveriesRouter = router;

// Step 3 implemented: Created daily deliveries routes with shift and date filtering
