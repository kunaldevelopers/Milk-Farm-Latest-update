import { Request, Response } from "express";
import { Client } from "../models/Client";
import { Staff } from "../models/Staff";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

export const getAll = async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    let query = {};

    // If user is staff, only return their assigned clients
    if (req.user.role === "staff") {
      const staff = await Staff.findOne({ userId: req.user.userId });
      if (!staff) {
        return res.status(404).json({ message: "Staff not found" });
      }
      query = { _id: { $in: staff.assignedClients } };
    }

    const clients = await Client.find(query)
      .populate("assignedStaff", "name")
      .lean();

    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ message: "Error fetching clients" });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: "Error fetching client" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    // Convert number fields to ensure they are numbers
    const pricePerLitre = parseFloat(req.body.pricePerLitre);
    const quantity = parseFloat(req.body.quantity);

    // Validate number fields
    if (isNaN(pricePerLitre) || pricePerLitre <= 0) {
      return res.status(400).json({
        message: "Price per litre must be a valid positive number",
      });
    }

    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be a valid positive number",
      });
    }

    // Add current month/year for the billing info
    const now = new Date();
    const clientData = {
      ...req.body,
      pricePerLitre,
      quantity,
      monthlyBilling: {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalQuantity: 0,
        totalAmount: 0,
        isPaid: false,
      },
      deliveryStatus: "Pending",
      deliveryHistory: [],
    };

    console.log("Creating client with data:", JSON.stringify(clientData));
    const client = new Client(clientData);
    await client.save();

    console.log("Client created successfully:", client._id);
    res.status(201).json(client);
  } catch (error) {
    console.error("Error creating client:", error);
    res.status(500).json({
      message: "Error creating client",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    // Convert and validate number fields
    const pricePerLitre = parseFloat(req.body.pricePerLitre);
    const quantity = parseFloat(req.body.quantity);

    if (isNaN(pricePerLitre) || pricePerLitre <= 0) {
      return res.status(400).json({
        message: "Price per litre must be a valid positive number",
      });
    }

    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be a valid positive number",
      });
    }

    const clientData = {
      ...req.body,
      pricePerLitre,
      quantity,
    };

    const client = await Client.findByIdAndUpdate(req.params.id, clientData, {
      new: true,
      runValidators: true,
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json(client);
  } catch (error) {
    console.error("Error updating client:", error);
    res.status(500).json({
      message: "Error updating client",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting client" });
  }
};

export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const { status, reason } = req.body;
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const deliveryRecord = {
      date: new Date(),
      status,
      quantity: client.quantity,
      reason,
    };

    client.deliveryStatus = status;
    client.deliveryHistory.push(deliveryRecord);
    await client.save();

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: "Error updating delivery status" });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const date = req.query.date
      ? new Date(req.query.date as string)
      : new Date();

    // Get month range for the selected date
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    // Get day range for the selected date
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Get totals using Promise.all for better performance
    const [
      totalClients,
      totalStaff,
      monthlyDeliveries,
      dailyDeliveries,
      todayAssignments,
    ] = await Promise.all([
      Client.countDocuments({}),
      Staff.countDocuments({}),
      // Monthly stats
      Client.aggregate([
        {
          $unwind: "$deliveryHistory",
        },
        {
          $match: {
            "deliveryHistory.date": { $gte: monthStart, $lte: monthEnd },
            "deliveryHistory.status": "Delivered",
          },
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: "$deliveryHistory.quantity" },
            totalAmount: {
              $sum: {
                $multiply: ["$deliveryHistory.quantity", "$pricePerLitre"],
              },
            },
          },
        },
      ]),
      // Daily stats
      Client.aggregate([
        {
          $unwind: "$deliveryHistory",
        },
        {
          $match: {
            "deliveryHistory.date": { $gte: dayStart, $lte: dayEnd },
            "deliveryHistory.status": "Delivered",
          },
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: "$deliveryHistory.quantity" },
            totalAmount: {
              $sum: {
                $multiply: ["$deliveryHistory.quantity", "$pricePerLitre"],
              },
            },
          },
        },
      ]),
      // Today's assignments
      Client.aggregate([
        {
          $match: {
            assignedStaff: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            totalAssignedQuantity: { $sum: "$quantity" },
          },
        },
      ]),
    ]);

    res.json({
      totalClients,
      totalStaff,
      todayDelivery: dailyDeliveries[0]?.totalQuantity || 0,
      todayAmount: dailyDeliveries[0]?.totalAmount || 0,
      monthlyTotal: monthlyDeliveries[0]?.totalQuantity || 0,
      monthlyAmount: monthlyDeliveries[0]?.totalAmount || 0,
      assignedQuantity: todayAssignments[0]?.totalAssignedQuantity || 0,
      date: date,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Error fetching dashboard statistics" });
  }
};

export const getSalesHistory = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const salesHistory = await Client.aggregate([
      {
        $unwind: "$deliveryHistory",
      },
      {
        $match: {
          "deliveryHistory.date": { $gte: start, $lte: end },
          "deliveryHistory.status": "Delivered",
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$deliveryHistory.date",
              },
            },
          },
          totalQuantity: { $sum: "$deliveryHistory.quantity" },
          totalAmount: {
            $sum: {
              $multiply: ["$deliveryHistory.quantity", "$pricePerLitre"],
            },
          },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    res.json(salesHistory);
  } catch (error) {
    console.error("Error fetching sales history:", error);
    res.status(500).json({ message: "Error fetching sales history" });
  }
};

export const getDetailedSales = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const detailedSales = await Client.aggregate([
      {
        $match: {
          "deliveryHistory.date": { $gte: start, $lte: end },
        },
      },
      {
        $unwind: "$deliveryHistory",
      },
      {
        $match: {
          "deliveryHistory.date": { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: "staff",
          localField: "assignedStaff",
          foreignField: "_id",
          as: "staffInfo",
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
          clientName: "$name",
          contactNumber: "$number",
          timeShift: 1,
          quantity: "$deliveryHistory.quantity",
          amount: {
            $multiply: ["$deliveryHistory.quantity", "$pricePerLitre"],
          },
          deliveryStatus: "$deliveryHistory.status",
          staffName: { $ifNull: ["$staffInfo.name", "Unassigned"] },
        },
      },
      {
        $sort: {
          "deliveryHistory.date": 1,
          clientName: 1,
        },
      },
    ]);

    res.json(detailedSales);
  } catch (error) {
    console.error("Error fetching detailed sales:", error);
    res.status(500).json({ message: "Error fetching detailed sales data" });
  }
};
