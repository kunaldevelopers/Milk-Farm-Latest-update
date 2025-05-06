import mongoose from "mongoose";
import { Client } from "../models/Client";
import { Staff } from "../models/Staff";
import { StaffSession } from "../models/StaffSession";
import { DailyDelivery } from "../models/DailyDelivery";
import { User } from "../models/User";
import { config } from "../config";

/**
 * Seed script to generate demo data for the daily delivery system with AM/PM shifts
 */
const seedDailyDeliveries = async () => {
  try {
    console.log("Starting demo data seeding process...");
    await mongoose.connect(config.mongoUri);

    // First, ensure the specified user has a Staff document linked
    const targetUserId = "68120be15ad7082d47fb3049";
    console.log(`Ensuring staff record exists for user ID: ${targetUserId}`);

    // Check if user exists
    const user = await User.findById(targetUserId);
    if (!user) {
      console.log(
        `User with ID ${targetUserId} not found. Please create this user first.`
      );
    } else {
      // Check if staff record exists for this user
      let staffRecord = await Staff.findOne({ userId: targetUserId });

      if (!staffRecord) {
        // Create staff record for this user
        staffRecord = await Staff.create({
          userId: targetUserId,
          name: user.name || user.username,
          contactNumber: user.contactNumber,
          location: user.location,
          assignedClients: [],
          isAvailable: true,
          totalMilkQuantity: 0,
        });
        console.log(
          `Created new staff record for user ${targetUserId} with staff ID: ${staffRecord._id}`
        );
      } else {
        console.log(
          `Found existing staff record for user ${targetUserId} with staff ID: ${staffRecord._id}`
        );
      }

      // Ensure current date (2025-05-01) session exists for this staff
      const currentDate = new Date("2025-05-01");
      currentDate.setHours(0, 0, 0, 0);

      const randomShift = Math.random() > 0.5 ? "AM" : "PM";
      const existingSession = await StaffSession.findOne({
        staffId: staffRecord._id,
        date: currentDate,
      });

      if (!existingSession) {
        // Create a session for the current date
        const session = await StaffSession.create({
          staffId: staffRecord._id,
          shift: randomShift,
          date: currentDate,
        });
        console.log(
          `Created session for staff ${staffRecord._id} on 2025-05-01 with ${randomShift} shift`
        );
      } else {
        console.log(
          `Found existing session for staff ${staffRecord._id} on 2025-05-01 with ${existingSession.shift} shift`
        );
      }
    }

    // Get existing staff and clients
    const staffMembers = await Staff.find().limit(5);
    console.log(`Found ${staffMembers.length} staff members`);

    const clients = await Client.find().limit(30);
    console.log(`Found ${clients.length} clients`);

    if (clients.length === 0 || staffMembers.length === 0) {
      console.log(
        "Not enough staff or clients found. Please run the basic seeding script first."
      );
      await mongoose.disconnect();
      return;
    }

    // Ensure clients have timeShift values (randomly assign if not present)
    for (const client of clients) {
      if (!client.timeShift) {
        client.timeShift = Math.random() > 0.5 ? "AM" : "PM";
        await client.save();
        console.log(
          `Updated client ${client.name} with ${client.timeShift} shift`
        );
      }
    }

    // Create sample dates for historical data (past 3 days plus today)
    const today = new Date("2025-05-01"); // Use the specific date
    today.setHours(0, 0, 0, 0);

    const dates = [
      new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // yesterday
      today, // today (2025-05-01)
      new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // tomorrow (for testing future dates)
    ];

    // For each date, create staff sessions and deliveries
    for (const date of dates) {
      console.log(`Seeding data for date: ${date.toISOString().split("T")[0]}`);

      // Create staff sessions for each date (random AM/PM assignments)
      const staffSessions = [];
      for (const staff of staffMembers) {
        const shift = Math.random() > 0.5 ? "AM" : "PM";

        const existingSession = await StaffSession.findOne({
          staffId: staff._id,
          date: date,
        });

        if (existingSession) {
          existingSession.shift = shift;
          await existingSession.save();
          staffSessions.push(existingSession);
          console.log(
            `Updated session for staff ${staff.name}: ${shift} shift on ${
              date.toISOString().split("T")[0]
            }`
          );
        } else {
          const newSession = await StaffSession.create({
            staffId: staff._id,
            shift,
            date,
          });
          staffSessions.push(newSession);
          console.log(
            `Created session for staff ${staff.name}: ${shift} shift on ${
              date.toISOString().split("T")[0]
            }`
          );
        }
      }

      // Create deliveries for AM shift
      const amStaffIds = staffSessions
        .filter((session) => session.shift === "AM")
        .map((session) => session.staffId);

      const amClients = clients.filter((client) => client.timeShift === "AM");

      // Distribute AM clients among AM staff
      if (amStaffIds.length > 0) {
        for (const client of amClients) {
          // Random staff assignment for this client on this date
          const randomStaffId =
            amStaffIds[Math.floor(Math.random() * amStaffIds.length)];

          // Random delivery status (80% delivered, 20% not delivered)
          const isDelivered = Math.random() > 0.2;
          const deliveryStatus = isDelivered ? "Delivered" : "Not Delivered";
          const quantity = isDelivered ? client.quantity : 0;
          const price = isDelivered
            ? client.quantity * client.pricePerLitre
            : 0;
          const notes = isDelivered ? "" : "Customer not available";

          // Check if there's an existing delivery record for this day and client
          const existingDelivery = await DailyDelivery.findOne({
            clientId: client._id,
            date: date,
          });

          if (existingDelivery) {
            existingDelivery.staffId = randomStaffId;
            existingDelivery.shift = "AM";
            existingDelivery.deliveryStatus = deliveryStatus;
            existingDelivery.quantity = quantity;
            existingDelivery.price = price;
            existingDelivery.notes = notes;
            await existingDelivery.save();
          } else {
            await DailyDelivery.create({
              clientId: client._id,
              staffId: randomStaffId,
              date: date,
              shift: "AM",
              deliveryStatus: deliveryStatus,
              quantity: quantity,
              price: price,
              notes: notes,
            });
          }
        }
        console.log(
          `Created/updated deliveries for ${amClients.length} AM clients on ${
            date.toISOString().split("T")[0]
          }`
        );
      }

      // Create deliveries for PM shift
      const pmStaffIds = staffSessions
        .filter((session) => session.shift === "PM")
        .map((session) => session.staffId);

      const pmClients = clients.filter((client) => client.timeShift === "PM");

      // Distribute PM clients among PM staff
      if (pmStaffIds.length > 0) {
        for (const client of pmClients) {
          // Random staff assignment for this client on this date
          const randomStaffId =
            pmStaffIds[Math.floor(Math.random() * pmStaffIds.length)];

          // Random delivery status (80% delivered, 20% not delivered)
          const isDelivered = Math.random() > 0.2;
          const deliveryStatus = isDelivered ? "Delivered" : "Not Delivered";
          const quantity = isDelivered ? client.quantity : 0;
          const price = isDelivered
            ? client.quantity * client.pricePerLitre
            : 0;
          const notes = isDelivered ? "" : "Customer not available";

          // Check if there's an existing delivery record for this day and client
          const existingDelivery = await DailyDelivery.findOne({
            clientId: client._id,
            date: date,
          });

          if (existingDelivery) {
            existingDelivery.staffId = randomStaffId;
            existingDelivery.shift = "PM";
            existingDelivery.deliveryStatus = deliveryStatus;
            existingDelivery.quantity = quantity;
            existingDelivery.price = price;
            existingDelivery.notes = notes;
            await existingDelivery.save();
          } else {
            await DailyDelivery.create({
              clientId: client._id,
              staffId: randomStaffId,
              date: date,
              shift: "PM",
              deliveryStatus: deliveryStatus,
              quantity: quantity,
              price: price,
              notes: notes,
            });
          }
        }
        console.log(
          `Created/updated deliveries for ${pmClients.length} PM clients on ${
            date.toISOString().split("T")[0]
          }`
        );
      }
    }

    console.log("Demo data seeding completed!");
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error in demo data seeding:", error);
    await mongoose.disconnect();
  }
};

// Execute the seeding function
seedDailyDeliveries();

// Step 5 implemented: Created demo data seeding script
