import { Request, Response } from "express";
import { Client } from "../models/Client";
import { Staff } from "../models/Staff";
import { DailyDelivery } from "../models/DailyDelivery";
import { StaffSession } from "../models/StaffSession";
import mongoose from "mongoose";

/**
 * Get comprehensive dashboard data with accurate metrics
 */
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // Parse date from query or use today
    let queryDate = new Date();
    if (req.query.date) {
      queryDate = new Date(req.query.date as string);
    }

    // Create date range for the full day in UTC
    const dateString = queryDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const startDate = new Date(dateString);
    const endDate = new Date(dateString);
    endDate.setHours(23, 59, 59, 999);

    console.log(
      `[DASHBOARD] Querying deliveries for date range: ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // Get shift filter if provided
    const shiftFilter = req.query.shift as string;

    // Get counts
    const totalClients = await Client.countDocuments();
    const totalStaff = await Staff.countDocuments();

    // Get today's and monthly totals with proper date handling
    const todaysTotals = await getTodaysDeliveryTotal(startDate, endDate);
    const monthlyTotals = await getMonthlyDeliveryTotal(queryDate);

    // Get success rate for today
    const deliverySuccessRate = await getDeliverySuccessRate(
      startDate,
      endDate
    );

    // Get assigned milk quantity
    const totalAssignedQuantity = await Client.aggregate([
      { $group: { _id: null, totalQuantity: { $sum: "$quantity" } } },
    ]);
    const assignedQuantity =
      totalAssignedQuantity.length > 0
        ? totalAssignedQuantity[0].totalQuantity
        : 0;

    // Get today's delivery records with shift filtering
    const deliveryRecords = await getTodaysDeliveryRecords(
      startDate,
      endDate,
      shiftFilter
    );

    // Get staff performance
    const staffPerformance = await getStaffPerformance(startDate, endDate);

    // Get shift analytics
    const shiftAnalytics = await getShiftAnalytics(startDate, endDate);

    // Send dashboard data
    res.json({
      counts: {
        totalClients,
        totalStaff,
      },
      today: {
        date: queryDate.toISOString(),
        quantity: todaysTotals.quantity,
        revenue: todaysTotals.revenue,
        successRate: deliverySuccessRate.successRate,
      },
      monthly: {
        quantity: monthlyTotals.quantity,
        revenue: monthlyTotals.revenue,
      },
      deliverySummary: {
        totalDeliveries: deliverySuccessRate.total,
        delivered: deliverySuccessRate.delivered,
        successRate: deliverySuccessRate.successRate,
        totalQuantity: todaysTotals.quantity,
        totalRevenue: todaysTotals.revenue,
      },
      assignmentStatus: {
        totalQuantityAssigned: assignedQuantity,
      },
      deliveryRecords,
      staffPerformance,
      shiftAnalytics,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      message: "Error retrieving dashboard data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get today's total delivery quantity and revenue
 */
const getTodaysDeliveryTotal = async (startDate: Date, endDate: Date) => {
  console.log(
    `[DASHBOARD] Getting today's totals for ${startDate.toISOString()} to ${endDate.toISOString()}`
  );

  // Ensure dates are set to midnight for consistent comparison
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const result = await DailyDelivery.aggregate([
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
        deliveryStatus: "Delivered",
      },
    },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: "$quantity" },
        totalRevenue: { $sum: "$price" },
      },
    },
  ]);

  const returnValue =
    result.length > 0
      ? { quantity: result[0].totalQuantity, revenue: result[0].totalRevenue }
      : { quantity: 0, revenue: 0 };

  console.log(`[DASHBOARD] Today's totals: ${JSON.stringify(returnValue)}`);
  return returnValue;
};

/**
 * Get monthly total delivery quantity and revenue
 */
const getMonthlyDeliveryTotal = async (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // Create date range for the current month
  const firstDayStr = `${year}-${month.toString().padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0); // Last day of current month
  const lastDayStr = `${year}-${month
    .toString()
    .padStart(2, "0")}-${lastDay.getDate()}`;

  const firstDay = new Date(firstDayStr);
  firstDay.setHours(0, 0, 0, 0);
  lastDay.setHours(23, 59, 59, 999);

  console.log(
    `[DASHBOARD] Querying monthly deliveries: ${firstDay.toISOString()} to ${lastDay.toISOString()}`
  );

  const result = await DailyDelivery.aggregate([
    {
      $match: {
        date: {
          $gte: firstDay,
          $lte: lastDay,
        },
        deliveryStatus: "Delivered",
      },
    },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: "$quantity" },
        totalRevenue: { $sum: "$price" },
      },
    },
  ]);

  const returnValue =
    result.length > 0
      ? {
          quantity: result[0].totalQuantity || 0,
          revenue: result[0].totalRevenue || 0,
        }
      : { quantity: 0, revenue: 0 };

  console.log(`[DASHBOARD] Monthly totals: ${JSON.stringify(returnValue)}`);
  return returnValue;
};

/**
 * Get delivery success rate
 */
const getDeliverySuccessRate = async (startDate: Date, endDate: Date) => {
  console.log(
    `[DASHBOARD] Querying success rate between ${startDate.toISOString()} and ${endDate.toISOString()}`
  );

  // Set consistent times for date comparison
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const aggregateResult = await DailyDelivery.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalDeliveries: { $sum: 1 },
        delivered: {
          $sum: {
            $cond: [{ $eq: ["$deliveryStatus", "Delivered"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const result =
    aggregateResult.length > 0
      ? {
          total: aggregateResult[0].totalDeliveries,
          delivered: aggregateResult[0].delivered,
          successRate:
            aggregateResult[0].totalDeliveries > 0
              ? (aggregateResult[0].delivered /
                  aggregateResult[0].totalDeliveries) *
                100
              : 0,
        }
      : {
          total: 0,
          delivered: 0,
          successRate: 0,
        };

  console.log(`[DASHBOARD] Success rate results: ${JSON.stringify(result)}`);
  return result;
};

/**
 * Get staff performance by delivery success rate
 */
const getStaffPerformance = async (startDate: Date, endDate: Date) => {
  console.log(
    `[DASHBOARD] Querying staff performance between ${startDate.toISOString()} and ${endDate.toISOString()}`
  );

  const staffPerformance = await DailyDelivery.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$staffId",
        deliveredCount: {
          $sum: {
            $cond: [{ $eq: ["$deliveryStatus", "Delivered"] }, 1, 0],
          },
        },
        notDeliveredCount: {
          $sum: {
            $cond: [{ $eq: ["$deliveryStatus", "Not Delivered"] }, 1, 0],
          },
        },
        totalQuantity: { $sum: "$quantity" },
        totalRevenue: { $sum: "$price" },
      },
    },
    {
      $lookup: {
        from: "staffs",
        localField: "_id",
        foreignField: "_id",
        as: "staffInfo",
      },
    },
    {
      $unwind: {
        path: "$staffInfo",
        preserveNullAndEmptyArrays: true, // Keep staff entries even if no matching info
      },
    },
    {
      $project: {
        staffName: { $ifNull: ["$staffInfo.name", "Unknown Staff"] },
        deliveredCount: 1,
        notDeliveredCount: 1,
        totalQuantity: 1,
        totalRevenue: 1,
        successRate: {
          $multiply: [
            {
              $cond: [
                {
                  $eq: [{ $add: ["$deliveredCount", "$notDeliveredCount"] }, 0],
                },
                0,
                {
                  $divide: [
                    "$deliveredCount",
                    { $add: ["$deliveredCount", "$notDeliveredCount"] },
                  ],
                },
              ],
            },
            100,
          ],
        },
      },
    },
  ]);

  console.log(
    `[DASHBOARD] Found ${staffPerformance.length} staff performance records`
  );
  return staffPerformance;
};

/**
 * Get shift-based analytics
 */
const getShiftAnalytics = async (startDate: Date, endDate: Date) => {
  console.log(
    `[DASHBOARD] Querying shift analytics between ${startDate.toISOString()} and ${endDate.toISOString()}`
  );

  const shiftAnalytics = await DailyDelivery.aggregate([
    { $match: { date: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: "$shift",
        deliveryCount: { $sum: 1 },
        deliveredCount: {
          $sum: {
            $cond: [{ $eq: ["$deliveryStatus", "Delivered"] }, 1, 0],
          },
        },
        totalQuantity: { $sum: "$quantity" },
        totalRevenue: { $sum: "$price" },
      },
    },
    {
      $project: {
        shift: "$_id",
        deliveryCount: 1,
        deliveredCount: 1,
        successRate: {
          $multiply: [
            {
              $cond: [
                { $eq: ["$deliveryCount", 0] },
                0,
                { $divide: ["$deliveredCount", "$deliveryCount"] },
              ],
            },
            100,
          ],
        },
        totalQuantity: 1,
        totalRevenue: 1,
        _id: 0,
      },
    },
  ]);

  console.log(
    `[DASHBOARD] Found ${shiftAnalytics.length} shift analytics records`
  );
  if (shiftAnalytics.length > 0) {
    console.log(
      `[DASHBOARD] Shift analytics sample: ${JSON.stringify(shiftAnalytics[0])}`
    );
  }

  return shiftAnalytics;
};

/**
 * Get client delivery history
 */
export const getDeliveryHistory = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate client ID
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Invalid client ID format" });
    }

    // Create date range filter
    let dateFilter: { $gte?: Date; $lte?: Date } = {};
    if (startDate || endDate) {
      dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate as string);
      if (endDate) dateFilter.$lte = new Date(endDate as string);
    }

    // Query for delivery records
    const deliveryHistory = await DailyDelivery.find({
      clientId,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    })
      .sort({ date: -1 })
      .populate("staffId", "name");

    // Also get the client details including their embedded delivery history
    const client = await Client.findById(clientId, "name deliveryHistory");
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json({
      client: client.name,
      deliveries: deliveryHistory,
      clientHistory: client.deliveryHistory,
    });
  } catch (error) {
    console.error("Error fetching delivery history:", error);
    res.status(500).json({
      message: "Error retrieving delivery history",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get delivery trends over time
 */
export const getDeliveryTrends = async (req: Request, res: Response) => {
  try {
    const { period } = req.query; // 'daily', 'weekly', or 'monthly'
    const { startDate, endDate } = req.query;

    let start = new Date();
    let end = new Date();

    // Set default date range if not provided
    if (startDate) {
      start = new Date(startDate as string);
    } else {
      // Default to last 30 days
      start.setDate(start.getDate() - 30);
    }

    if (endDate) {
      end = new Date(endDate as string);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Define grouping based on period
    let groupBy;
    let dateFormat;

    switch (period) {
      case "weekly":
        groupBy = {
          $week: "$date",
        };
        dateFormat = "%Y-W%U"; // Year-WeekNumber
        break;
      case "monthly":
        groupBy = {
          year: { $year: "$date" },
          month: { $month: "$date" },
        };
        dateFormat = "%Y-%m"; // Year-Month
        break;
      case "daily":
      default:
        groupBy = {
          $dateToString: { format: "%Y-%m-%d", date: "$date" },
        };
        dateFormat = "%Y-%m-%d"; // Year-Month-Day
    }

    // Run aggregation
    const trends = await DailyDelivery.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: groupBy,
          totalDeliveries: { $sum: 1 },
          successfulDeliveries: {
            $sum: {
              $cond: [{ $eq: ["$deliveryStatus", "Delivered"] }, 1, 0],
            },
          },
          totalQuantity: { $sum: "$quantity" },
          totalRevenue: { $sum: "$price" },
        },
      },
      {
        $project: {
          period: "$_id",
          totalDeliveries: 1,
          successfulDeliveries: 1,
          successRate: {
            $multiply: [
              {
                $cond: [
                  { $eq: ["$totalDeliveries", 0] },
                  0,
                  { $divide: ["$successfulDeliveries", "$totalDeliveries"] },
                ],
              },
              100,
            ],
          },
          totalQuantity: 1,
          totalRevenue: 1,
          _id: 0,
        },
      },
      { $sort: { period: 1 } },
    ]);

    res.json(trends);
  } catch (error) {
    console.error("Error fetching delivery trends:", error);
    res.status(500).json({
      message: "Error retrieving delivery trends",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get non-delivery reasons summary
 */
export const getNonDeliveryReasons = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let start = new Date();
    let end = new Date();

    // Set default date range if not provided
    if (startDate) {
      start = new Date(startDate as string);
    } else {
      // Default to last 30 days
      start.setDate(start.getDate() - 30);
    }

    if (endDate) {
      end = new Date(endDate as string);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const nonDeliveryReasons = await DailyDelivery.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
          deliveryStatus: "Not Delivered",
          notes: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$notes",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          reason: "$_id",
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(nonDeliveryReasons);
  } catch (error) {
    console.error("Error fetching non-delivery reasons:", error);
    res.status(500).json({
      message: "Error retrieving non-delivery reasons",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Debug endpoint to diagnose delivery data issues with date comparisons
 */
export const debugDeliveryData = async (req: Request, res: Response) => {
  try {
    // Parse date from query or use today
    let date = new Date();
    if (req.query.date) {
      date = new Date(req.query.date as string);
    }

    // Create start and end dates for the full day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    console.log(
      `DEBUG: Querying deliveries between ${startDate.toISOString()} and ${endDate.toISOString()}`
    );

    // Query using date range
    const rangeDeliveries = await DailyDelivery.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("clientId", "name")
      .populate("staffId", "name")
      .lean();

    // Query using exact date (the problematic approach)
    const exactDateDeliveries = await DailyDelivery.find({
      date: startDate,
    }).lean();

    // Get raw delivery statuses for comparison
    const rawDeliveryStatuses = await DailyDelivery.distinct("deliveryStatus");

    // Count by delivery status
    const statusCounts: { [key in "Delivered" | "Not Delivered"]: number } = {
      Delivered: 0,
      "Not Delivered": 0,
    };
    rangeDeliveries.forEach((delivery) => {
      const status = delivery.deliveryStatus as "Delivered" | "Not Delivered";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // All deliveries in database (for small test datasets)
    const allDeliveries = await DailyDelivery.find()
      .sort({ date: -1 })
      .limit(20)
      .lean();

    // Check actual dates stored in database
    const allDates = allDeliveries.map((d) => ({
      date: d.date,
      dateString: d.date.toISOString(),
      clientId: d.clientId,
      status: d.deliveryStatus,
    }));

    // Format for readability
    const readableRangeDeliveries = rangeDeliveries.map((delivery) => ({
      id: delivery._id.toString(),
      clientName: (delivery.clientId as any)?.name || "Unknown",
      staffName: (delivery.staffId as any)?.name || "Unknown",
      shift: delivery.shift,
      date: delivery.date,
      exactHoursMinsSecs: `${delivery.date.getHours()}:${delivery.date.getMinutes()}:${delivery.date.getSeconds()}`,
      deliveryStatus: delivery.deliveryStatus,
      quantity: delivery.quantity,
      price: delivery.price,
    }));

    res.json({
      queryDate: date.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      rangeDeliveriesCount: rangeDeliveries.length,
      exactDateDeliveriesCount: exactDateDeliveries.length,
      rawDeliveryStatuses,
      statusCounts,
      rangeDeliveries: readableRangeDeliveries,
      allDatesInDb: allDates,
    });
  } catch (error) {
    console.error("Error in debug delivery data:", error);
    res.status(500).json({
      message: "Error debugging delivery data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const getTodaysDeliveryRecords = async (
  startDate: Date,
  endDate: Date,
  shiftFilter?: string
) => {
  // Ensure proper date comparison
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const matchCriteria: any = {
    date: { $gte: startDate, $lte: endDate },
  };

  if (shiftFilter && ["AM", "PM"].includes(shiftFilter)) {
    matchCriteria.shift = shiftFilter;
  }

  const deliveryRecords = await DailyDelivery.aggregate([
    {
      $match: matchCriteria,
    },
    {
      $sort: { date: -1 },
    },
    {
      $lookup: {
        from: "clients",
        localField: "clientId",
        foreignField: "_id",
        as: "clientInfo",
      },
    },
    {
      $lookup: {
        from: "staffs",
        localField: "staffId",
        foreignField: "_id",
        as: "staffInfo",
      },
    },
    {
      $unwind: {
        path: "$clientInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$staffInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        clientName: { $ifNull: ["$clientInfo.name", "Unknown"] },
        location: { $ifNull: ["$clientInfo.location", ""] },
        staff: { $ifNull: ["$staffInfo.name", "Unknown"] },
        shift: 1,
        quantity: 1,
        price: 1,
        status: "$deliveryStatus",
      },
    },
  ]);

  return deliveryRecords;
};
