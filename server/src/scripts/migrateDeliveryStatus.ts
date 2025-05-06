import mongoose from "mongoose";
import { DailyDelivery } from "../models/DailyDelivery";
import { Client } from "../models/Client";
import { config } from "../config";

const migrateDeliveryStatus = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Connected to MongoDB");

    // First update DailyDelivery records
    console.log("Updating DailyDelivery records...");
    const dailyDeliveryResult = await DailyDelivery.updateMany(
      { deliveryStatus: { $in: ["delivered", "not_delivered"] } },
      [
        {
          $set: {
            deliveryStatus: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$deliveryStatus", "delivered"] },
                    then: "Delivered",
                  },
                  {
                    case: { $eq: ["$deliveryStatus", "not_delivered"] },
                    then: "Not Delivered",
                  },
                ],
                default: "$deliveryStatus",
              },
            },
          },
        },
      ]
    );

    console.log("Updated DailyDelivery records:", dailyDeliveryResult);

    // Then update Client records
    console.log("Updating Client records...");
    const clientResult = await Client.updateMany(
      {
        deliveryStatus: {
          $in: ["Delivered", "Not Delivered", "delivered", "not_delivered"],
        },
      },
      [
        {
          $set: {
            deliveryStatus: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$deliveryStatus", "delivered"] },
                    then: "Delivered",
                  },
                  {
                    case: { $eq: ["$deliveryStatus", "not_delivered"] },
                    then: "Not Delivered",
                  },
                ],
                default: "$deliveryStatus",
              },
            },
          },
        },
      ]
    );

    console.log("Updated Client records:", clientResult);

    // Finally update delivery history records
    console.log("Updating delivery history records...");
    const deliveryHistoryResult = await Client.updateMany(
      {
        "deliveryHistory.status": {
          $in: ["delivered", "not_delivered", "Not Delivered"],
        },
      },
      [
        {
          $set: {
            deliveryHistory: {
              $map: {
                input: "$deliveryHistory",
                as: "record",
                in: {
                  $mergeObjects: [
                    "$$record",
                    {
                      status: {
                        $switch: {
                          branches: [
                            {
                              case: {
                                $eq: ["$$record.status", "delivered"],
                              },
                              then: "Delivered",
                            },
                            {
                              case: {
                                $eq: ["$$record.status", "not_delivered"],
                              },
                              then: "Not Delivered",
                            },
                          ],
                          default: "$$record.status",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]
    );

    console.log("Updated delivery history records:", deliveryHistoryResult);
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateDeliveryStatus();
}
