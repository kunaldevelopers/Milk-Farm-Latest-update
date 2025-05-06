import { Request, Response } from "express";
import { Staff } from "../models/Staff";
import { Client } from "../models/Client";
import { User } from "../models/User";
import { StaffSession } from "../models/StaffSession";
import { DailyDelivery } from "../models/DailyDelivery";
import bcrypt from "bcrypt";
import mongoose, { Types } from "mongoose";

export const getAll = async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Populate user data and select required fields
    const staffMembers = await Staff.find()
      .populate({
        path: "userId",
        model: "User",
        select: "username name role",
      })
      .lean();

    // Format the response
    const formattedStaff = staffMembers.map((staff: any) => ({
      _id: staff._id,
      name: staff.name,
      username: (staff.userId as any)?.username || "",
      contactNumber: staff.contactNumber,
      location: staff.location,
      shift: staff.shift,
      assignedClients: staff.assignedClients,
      totalMilkQuantity: staff.totalMilkQuantity,
      isAvailable: staff.isAvailable,
      lastDeliveryDate: staff.lastDeliveryDate,
      createdAt: staff.createdAt || new Date(),
      updatedAt: staff.updatedAt || new Date(),
    }));

    res.json(formattedStaff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ message: "Error fetching staff members" });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const staff = await Staff.findById(req.params.id).populate(
      "userId",
      "username"
    );
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Format the response to include username
    const staffObj = staff.toObject();
    const userObj = staffObj.userId as any;
    const formattedStaff = {
      ...staffObj,
      username: userObj?.username || "",
    };

    res.json(formattedStaff);
  } catch (error) {
    console.error("Error fetching staff member:", error);
    res.status(500).json({ message: "Error fetching staff member" });
  }
};

export const getByUserId = async (req: Request, res: Response) => {
  try {
    console.log(
      `[STAFF DEBUG] Starting getByUserId for userId: ${req.params.userId}`
    );

    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`[STAFF DEBUG] Invalid user ID format: ${userId}`);
      return res.status(400).json({
        message: "Invalid user ID format",
        debug: { userId },
      });
    }

    // Find user and verify role
    const user = await User.findById(userId);

    if (!user) {
      console.error(`[STAFF DEBUG] User not found for ID: ${userId}`);
      return res.status(404).json({
        message: "User not found",
        debug: { userId },
      });
    }

    if (user.role !== "staff") {
      console.error(
        `[STAFF DEBUG] User ${userId} is not a staff member (role: ${user.role})`
      );
      return res.status(403).json({
        message: "User exists but is not a staff member",
        debug: { userId, actualRole: user.role },
      });
    }

    // Try to find existing staff record
    let staff = await Staff.findOne({ userId: new Types.ObjectId(userId) });

    // If no staff record exists, create one
    if (!staff) {
      console.log(`[STAFF DEBUG] Creating new staff record for user ${userId}`);

      try {
        staff = await Staff.create({
          userId: new Types.ObjectId(userId),
          name: user.name || user.username,
          shift: "AM",
          assignedClients: [],
          isAvailable: true,
          totalMilkQuantity: 0,
        });

        console.log(`[STAFF DEBUG] Successfully created new staff record:`, {
          staffId: staff._id,
          userId: staff.userId,
        });
      } catch (createError) {
        console.error(
          `[STAFF DEBUG] Failed to create staff record:`,
          createError
        );
        return res.status(500).json({
          message: "Failed to create staff record",
          error:
            createError instanceof Error
              ? createError.message
              : "Unknown error",
        });
      }
    }

    if (!staff) {
      return res.status(500).json({
        message: "Failed to retrieve or create staff record",
      });
    }

    // Populate the user data
    await staff.populate("userId", "username name role");

    console.log(`[STAFF DEBUG] Successfully retrieved staff record:`, {
      staffId: staff._id,
      userId: staff.userId,
      assignedClients: staff.assignedClients?.length || 0,
    });

    res.json(staff);
  } catch (error) {
    console.error("[STAFF DEBUG] Error in getByUserId:", error);
    res.status(500).json({
      message: "Error retrieving staff information",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getAssignedClients = async (req: Request, res: Response) => {
  try {
    const staffId = req.params.id;
    const { includeAll } = req.query;
    console.log(`[DEBUG] Fetching clients for staff ID: ${staffId}`);

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      console.error(`[DEBUG] Invalid staff ID format: ${staffId}`);
      return res.status(400).json({
        message: "Invalid staff ID format",
        details: `Provided ID ${staffId} is not a valid MongoDB ObjectId`,
      });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      console.error(`[DEBUG] Staff not found for ID: ${staffId}`);
      return res.status(404).json({
        message: "Staff member not found",
        details: `No staff record exists for ID ${staffId}`,
      });
    }

    console.log(
      `[DEBUG] Staff ${staffId} has ${
        staff.assignedClients.length
      } assigned clients: ${JSON.stringify(staff.assignedClients)}`
    );

    if (!staff.assignedClients || staff.assignedClients.length === 0) {
      console.log(`[DEBUG] No clients assigned to staff ${staffId}`);
      return res.json([]);
    }

    const assignedClients = await Client.find({
      _id: { $in: staff.assignedClients },
    })
      .sort({ name: 1 })
      .select(
        "_id name number location timeShift quantity pricePerLitre deliveryStatus"
      )
      .lean();

    console.log(
      `[DEBUG] Found ${assignedClients.length} total clients for staff ${staffId}`
    );

    // Only filter by shift if includeAll is not set to true
    if (includeAll !== "true") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const staffSession = await StaffSession.findOne({ staffId, date: today });

      if (staffSession?.shift) {
        const filteredClients = assignedClients.filter(
          (client) => client.timeShift === staffSession.shift
        );
        console.log(
          `[DEBUG] Filtered to ${filteredClients.length} clients for ${staffSession.shift} shift`
        );
        return res.json(filteredClients);
      }
    }

    // Return all assigned clients if no shift is selected or includeAll=true
    res.json(assignedClients);
  } catch (error) {
    console.error("Error in getAssignedClients:", error);
    res.status(500).json({
      message: "Error fetching assigned clients",
      error: error instanceof Error ? error.message : "Unknown error",
      details: "An unexpected error occurred while fetching assigned clients",
    });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access. Only admins can create staff members",
      });
    }

    const { name, username, password, contactNumber, location, shift } =
      req.body;

    // Import settings helper
    const { getSetting } = await import("../models/Settings");

    // Get valid shifts and roles from database
    const validShifts = await getSetting("shifts");
    const validRoles = await getSetting("roles");
    const defaultRole = (await getSetting("defaultRole")) || "staff";

    // Validate required fields
    if (!name || !username || !password) {
      return res.status(400).json({
        message: "Missing required fields",
        details: "Name, username, and password are required",
      });
    }

    // Validate shift if provided
    if (shift && validShifts && !validShifts.includes(shift)) {
      return res.status(400).json({
        message: `Invalid shift. Must be one of: ${validShifts.join(", ")}`,
      });
    }

    // Use default shift from settings
    const defaultShift = (await getSetting("defaultShift")) || "AM";
    const staffShift = shift || defaultShift;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Create user with better error handling
    let newUser;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      newUser = await User.create({
        username,
        password: hashedPassword,
        name,
        role: defaultRole,
        contactNumber,
        location,
      });
    } catch (userError) {
      console.error("Error creating user:", userError);
      return res.status(500).json({
        message: "Error creating user account",
        details:
          userError instanceof Error ? userError.message : "Unknown error",
      });
    }

    // Create staff record with user reference
    try {
      const staffData = {
        userId: newUser._id,
        name,
        contactNumber,
        location,
        shift: staffShift,
        assignedClients: [],
        isAvailable: true,
      };

      const staff = new Staff(staffData);
      await staff.save();

      return res.status(201).json({
        message: "Staff created successfully",
        staff: {
          ...staff.toObject(),
          username,
        },
      });
    } catch (staffError) {
      // If staff creation fails, clean up the created user
      await User.findByIdAndDelete(newUser._id);
      console.error("Error creating staff record:", staffError);
      return res.status(500).json({
        message: "Error creating staff record",
        details:
          staffError instanceof Error ? staffError.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("Staff creation error:", error);
    return res.status(500).json({
      message: "Error creating staff member",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: "Error updating staff member" });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    res.json({ message: "Staff member deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting staff member" });
  }
};

export const assignClient = async (req: Request, res: Response) => {
  try {
    const { staffId, clientId } = req.body;
    console.log(`[DEBUG] Assigning client ${clientId} to staff ${staffId}`);

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(staffId) ||
      !mongoose.Types.ObjectId.isValid(clientId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Validate staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Validate client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Check if assignment already exists
    if (staff.assignedClients.some((id) => id.toString() === clientId)) {
      return res
        .status(400)
        .json({ message: "Client already assigned to this staff member" });
    }

    // Check if client is already assigned to another staff
    if (client.assignedStaff) {
      return res.status(400).json({
        message:
          "Client is already assigned to another staff member. Please unassign first.",
      });
    }

    // Add client to staff's assignments
    staff.assignedClients.push(clientId as any); // Cast to any to avoid TS error

    // Set staff as client's assigned staff
    client.assignedStaff = staffId as any; // Cast to any to avoid TS error

    // Save both documents
    await Promise.all([staff.save(), client.save()]);

    console.log(
      `[DEBUG] Successfully assigned client ${clientId} to staff ${staffId}`
    );

    res.json({
      message: "Assignment successful",
      staff: {
        ...staff.toObject(),
        assignedClients: staff.assignedClients,
      },
    });
  } catch (error) {
    console.error("[DEBUG] Assignment error:", error);
    res.status(500).json({
      message: "Error creating assignment",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const removeAssignment = async (req: Request, res: Response) => {
  try {
    const { staffId, clientId } = req.body;
    console.log(
      `[DEBUG] Removing assignment between staff ${staffId} and client ${clientId}`
    );

    if (
      !mongoose.Types.ObjectId.isValid(staffId) ||
      !mongoose.Types.ObjectId.isValid(clientId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Find and validate staff
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Find and validate client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Verify the assignment exists
    if (!staff.assignedClients.some((id) => id.toString() === clientId)) {
      return res
        .status(400)
        .json({ message: "This client is not assigned to this staff member" });
    }

    // Remove client from staff's assignments
    staff.assignedClients = staff.assignedClients.filter(
      (id) => id.toString() !== clientId
    );

    // Clear staff assignment from client
    client.assignedStaff = undefined;

    // Save both documents
    await Promise.all([staff.save(), client.save()]);

    console.log(
      `[DEBUG] Successfully removed assignment between staff ${staffId} and client ${clientId}`
    );

    res.json({
      message: "Assignment removed successfully",
      staff: {
        ...staff.toObject(),
        assignedClients: staff.assignedClients,
      },
    });
  } catch (error) {
    console.error("[DEBUG] Remove assignment error:", error);
    res.status(500).json({
      message: "Error removing assignment",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const markClientDelivered = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // client ID from URL

    console.log(`Marking client ${id} as delivered`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid client ID format" });
    }

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try to find an existing delivery record for today
    let delivery = await DailyDelivery.findOne({
      clientId: client._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (delivery) {
      // Update existing record
      delivery.deliveryStatus = "Delivered";
      delivery.quantity = client.quantity;
      delivery.price = client.quantity * client.pricePerLitre;
      delivery.staffId = (req.user as any)?._id;
      await delivery.save();
    } else {
      // Create new delivery record
      delivery = new DailyDelivery({
        clientId: client._id,
        staffId: (req.user as any)?._id,
        date: new Date(),
        shift: client.timeShift,
        deliveryStatus: "Delivered",
        quantity: client.quantity,
        price: client.quantity * client.pricePerLitre,
      });
      await delivery.save();
    }

    // Update client status
    client.deliveryStatus = "Delivered";
    await client.save();

    res.json({ message: "Client marked as delivered", client, delivery });
  } catch (error) {
    console.error("Error marking client as delivered:", error);
    res.status(500).json({ message: "Error updating delivery status" });
  }
};

export const markClientUndelivered = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log(
      `Marking client ${id} as undelivered. Reason: ${reason || "Not provided"}`
    );

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid client ID format" });
    }

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get staff ID from either the user's staff record or the user ID
    let staffId = undefined;
    if (req.user?._id) {
      const staffRecord = await Staff.findOne({ userId: req.user._id });
      staffId = staffRecord?._id;
    }

    // Try to find an existing delivery record for today
    let delivery = await DailyDelivery.findOne({
      clientId: client._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (delivery) {
      // Update existing record
      delivery.deliveryStatus = "Not Delivered"; // Changed from "Not_Delivered"
      delivery.quantity = 0;
      delivery.price = 0;
      delivery.notes = reason;
      if (staffId) {
        delivery.staffId = staffId as any; // Cast to any to bypass strict type checking since we know the ID is valid
      }
      await delivery.save();
    } else {
      // Create new delivery record
      delivery = new DailyDelivery({
        clientId: client._id,
        staffId: staffId,
        date: new Date(),
        shift: client.timeShift,
        deliveryStatus: "Not Delivered", // Changed from "Not_Delivered"
        quantity: 0,
        price: 0,
        notes: reason,
      });
      await delivery.save();
    }

    // Update client status
    client.deliveryStatus = "Not Delivered"; // Changed from "Not_Delivered"
    client.deliveryNotes = reason;
    await client.save();

    res.json({ message: "Client marked as not delivered", client, delivery });
  } catch (error) {
    console.error("Error marking client as undelivered:", error);
    res.status(500).json({ message: "Error updating delivery status" });
  }
};

export const selectShift = async (req: Request, res: Response) => {
  try {
    const { id: staffId } = req.params;
    const { shift } = req.body;

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ message: "Invalid staff ID format" });
    }

    // Get valid shifts from database settings
    const { getSetting } = await import("../models/Settings");
    const validShifts = await getSetting("shifts");

    if (!shift || !validShifts.includes(shift)) {
      return res.status(400).json({
        message: `Valid shift (${validShifts.join(" or ")}) is required`,
      });
    }

    // Verify staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Set the date to today with time set to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create or update the staff session for today
    const staffSession = await StaffSession.findOneAndUpdate(
      { staffId, date: today },
      { staffId, shift, date: today },
      { upsert: true, new: true }
    );

    console.log(
      `Staff ${staffId} selected ${shift} shift for ${
        today.toISOString().split("T")[0]
      }`
    );

    res.json({
      message: `${shift} shift selected successfully`,
      staffSession,
    });
  } catch (error) {
    console.error("Error selecting shift:", error);
    res.status(500).json({
      message: "Error selecting shift",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getSessionByDate = async (req: Request, res: Response) => {
  try {
    const { id: staffId, date } = req.params;

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ message: "Invalid staff ID format" });
    }

    // Parse date or use today
    let sessionDate;
    if (date) {
      sessionDate = new Date(date);
    } else {
      sessionDate = new Date();
    }
    sessionDate.setHours(0, 0, 0, 0);

    const session = await StaffSession.findOne({ staffId, date: sessionDate });
    if (!session) {
      return res.status(404).json({
        message: "No shift selected for this date",
        staffId,
        date: sessionDate,
      });
    }

    res.json(session);
  } catch (error) {
    console.error("Error getting staff session:", error);
    res.status(500).json({
      message: "Error retrieving staff session",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const markClientDailyDelivered = async (req: Request, res: Response) => {
  try {
    const { id: staffId, clientId } = req.params;
    const { shift } = req.body;

    if (!shift) {
      return res.status(400).json({ message: "Shift is required" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(staffId) ||
      !mongoose.Types.ObjectId.isValid(clientId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Verify staff and client exist
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Check if client is assigned to this staff member
    if (
      !staff.assignedClients.some(
        (id) => id.toString() === (client._id as Types.ObjectId).toString()
      )
    ) {
      return res.status(400).json({
        message: "This client is not assigned to this staff member",
      });
    }

    // Get today's date at midnight for consistent comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get delivery status values from settings
    const { getSetting } = await import("../models/Settings");
    const deliveryStatuses = await getSetting("deliveryStatuses");
    const deliveredStatus =
      deliveryStatuses.find((s: string) => s === "Delivered") || "Delivered";

    // Record the delivery for today
    console.log(
      `[DEBUG] Marking client ${clientId} as delivered with status: "Delivered"`
    );

    const dailyDelivery = await DailyDelivery.findOneAndUpdate(
      {
        clientId,
        staffId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      {
        $set: {
          clientId,
          staffId,
          date: today,
          shift,
          deliveryStatus: "Delivered",
          quantity: client.quantity,
          price: client.quantity * client.pricePerLitre,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Update the client's delivery status field
    client.deliveryStatus = deliveredStatus;

    // Add to client's delivery history
    client.deliveryHistory.push({
      date: today,
      status: deliveredStatus,
      quantity: client.quantity,
    });

    await client.save();

    res.json({
      message: "Delivery marked as completed",
      dailyDelivery,
    });
  } catch (error) {
    console.error("Error marking client daily delivery:", error);
    res.status(500).json({
      message: "Error updating delivery status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const markClientDailyUndelivered = async (
  req: Request,
  res: Response
) => {
  try {
    const { id: staffId, clientId } = req.params;
    const { reason, shift } = req.body;

    if (!shift) {
      return res.status(400).json({ message: "Shift is required" });
    }

    if (!reason) {
      return res
        .status(400)
        .json({ message: "Reason is required for non-delivery" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(staffId) ||
      !mongoose.Types.ObjectId.isValid(clientId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Verify staff and client exist
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Check if client is assigned to this staff member
    if (
      !staff.assignedClients.some(
        (id) => id.toString() === (client._id as Types.ObjectId).toString()
      )
    ) {
      return res.status(400).json({
        message: "This client is not assigned to this staff member",
      });
    }

    // Get today's date at midnight for consistent comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get delivery status values from settings
    const { getSetting } = await import("../models/Settings");
    const deliveryStatuses = await getSetting("deliveryStatuses");
    const notDeliveredStatus =
      deliveryStatuses.find((s: string) => s === "Not Delivered") ||
      "Not Delivered";

    // Record the non-delivery for today
    const dailyDelivery = await DailyDelivery.findOneAndUpdate(
      {
        clientId,
        staffId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      {
        $set: {
          clientId,
          staffId,
          date: today,
          shift,
          deliveryStatus: "Not Delivered",
          quantity: 0,
          price: 0,
          notes: reason,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Update the client's delivery status field
    client.deliveryStatus = notDeliveredStatus;
    client.deliveryNotes = reason;

    // Add to client's delivery history
    client.deliveryHistory.push({
      date: today,
      status: notDeliveredStatus,
      quantity: 0,
      reason,
    });

    await client.save();

    res.json({
      message: "Client marked as not delivered",
      dailyDelivery,
    });
  } catch (error) {
    console.error("Error marking client as not delivered:", error);
    res.status(500).json({
      message: "Error updating delivery status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateAssignedClients = async (req: Request, res: Response) => {
  try {
    const { id: staffId } = req.params;
    const { shift } = req.body;

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ message: "Invalid staff ID format" });
    }

    if (!shift || !["AM", "PM"].includes(shift)) {
      return res
        .status(400)
        .json({ message: "Valid shift (AM or PM) is required" });
    }

    // Verify staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Get all clients assigned to this staff member
    const allAssignedClients = await Client.find({
      _id: { $in: staff.assignedClients },
    }).lean();

    // Filter clients based on the shift
    const filteredClientIds = allAssignedClients
      .filter((client) => client.timeShift === shift)
      .map((client) =>
        mongoose.Types.ObjectId.createFromHexString(client._id.toString())
      );

    // Update the staff's assignedClients field with only clients matching the shift
    staff.assignedClients = filteredClientIds;
    await staff.save();

    console.log(
      `Updated assigned clients for staff ${staffId} with ${shift} shift. Now has ${filteredClientIds.length} clients.`
    );

    res.json({
      message: `Successfully updated assigned clients based on ${shift} shift`,
      clientCount: filteredClientIds.length,
    });
  } catch (error) {
    console.error("Error updating assigned clients:", error);
    res.status(500).json({
      message: "Error updating assigned clients",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getAllAssignments = async (req: Request, res: Response) => {
  try {
    console.log("[STAFF DEBUG] Getting all staff-client assignments");

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get all staff members with their assigned clients
    const staffMembers = await Staff.find()
      .populate({
        path: "userId",
        model: "User",
        select: "username name role",
      })
      .lean();

    const staffWithClients = [];

    for (const staff of staffMembers) {
      // Skip staff with no assigned clients
      if (!staff.assignedClients || staff.assignedClients.length === 0) {
        staffWithClients.push({
          staff: {
            _id: staff._id,
            name: staff.name,
            username: (staff.userId as any)?.username || "",
          },
          clients: [],
        });
        continue;
      }

      // Find all clients assigned to this staff member
      const assignedClients = await Client.find({
        _id: { $in: staff.assignedClients },
      })
        .sort({ name: 1 })
        .select(
          "_id name number location timeShift quantity pricePerLitre deliveryStatus"
        )
        .lean();

      // Add to result
      staffWithClients.push({
        staff: {
          _id: staff._id,
          name: staff.name,
          username: (staff.userId as any)?.username || "",
        },
        clients: assignedClients || [],
      });
    }

    res.json(staffWithClients);
  } catch (error) {
    console.error("[STAFF DEBUG] Error in getAllAssignments:", error);
    res.status(500).json({
      message: "Error fetching staff assignments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const markDailyDelivered = async (req: Request, res: Response) => {
  try {
    const { staffId, clientId, date } = req.body;

    const dailyDelivery = await DailyDelivery.findOne({
      staffId,
      clientId,
      date: date || new Date().toISOString().split("T")[0],
    });

    if (!dailyDelivery) {
      const newDailyDelivery = new DailyDelivery({
        staffId,
        clientId,
        date: date || new Date().toISOString().split("T")[0],
        deliveryStatus: "Delivered",
      });
      await newDailyDelivery.save();
    } else {
      dailyDelivery.deliveryStatus = "Delivered";
      await dailyDelivery.save();
    }

    res.status(200).json({ message: "Delivery status updated successfully" });
  } catch (error) {
    console.error("Error in markDailyDelivered:", error);
    res.status(500).json({ message: "Failed to update delivery status" });
  }
};

export const markDailyUndelivered = async (req: Request, res: Response) => {
  try {
    const { staffId, clientId, reason, date } = req.body;

    const dailyDelivery = await DailyDelivery.findOne({
      staffId,
      clientId,
      date: date || new Date().toISOString().split("T")[0],
    });

    if (!dailyDelivery) {
      const newDailyDelivery = new DailyDelivery({
        staffId,
        clientId,
        date: date || new Date().toISOString().split("T")[0],
        deliveryStatus: "Not Delivered",
        reason,
      });
      await newDailyDelivery.save();
    } else {
      dailyDelivery.deliveryStatus = "Not Delivered";
      dailyDelivery.reason = reason;
      await dailyDelivery.save();
    }

    res.status(200).json({ message: "Delivery status updated successfully" });
  } catch (error) {
    console.error("Error in markDailyUndelivered:", error);
    res.status(500).json({ message: "Failed to update delivery status" });
  }
};

export const getDailyDeliveries = async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date parameter is required" });
    }

    // Convert date string to Date object for the start of the day
    const queryDate = new Date(date as string);
    queryDate.setHours(0, 0, 0, 0);

    // Get the end of the day
    const endDate = new Date(queryDate);
    endDate.setHours(23, 59, 59, 999);

    const deliveries = await DailyDelivery.find({
      staffId,
      date: {
        $gte: queryDate,
        $lte: endDate,
      },
    }).populate("clientId");

    res.status(200).json({ deliveries });
  } catch (error) {
    console.error("Error in getDailyDeliveries:", error);
    res.status(500).json({ message: "Failed to fetch daily deliveries" });
  }
};
