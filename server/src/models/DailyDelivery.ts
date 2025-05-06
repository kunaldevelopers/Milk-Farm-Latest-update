import { Schema, model, Document } from "mongoose";

interface IDailyDelivery extends Document {
  clientId: Schema.Types.ObjectId;
  staffId: Schema.Types.ObjectId;
  date: Date;
  shift: "AM" | "PM";
  deliveryStatus: "Delivered" | "Not Delivered" | "Pending"; // Added Pending status
  quantity: number;
  price: number;
  reason?: string; // Added reason field
  notes?: string;
}

const dailyDeliverySchema = new Schema<IDailyDelivery>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    date: {
      type: Date,
      required: true,
      default: () => new Date().setHours(0, 0, 0, 0),
    },
    shift: { type: String, enum: ["AM", "PM"], required: true },
    deliveryStatus: {
      type: String,
      enum: ["Delivered", "Not Delivered", "Pending"], // Added Pending status
      default: "Pending", // Changed default to Pending
    },
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    reason: { type: String }, // Added reason field
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Create a compound index on clientId and date to ensure uniqueness
dailyDeliverySchema.index({ clientId: 1, date: 1 }, { unique: true });

// Add index on date for better query performance with date ranges
dailyDeliverySchema.index({ date: 1 });

// Add index on delivery status for filtering
dailyDeliverySchema.index({ deliveryStatus: 1 });

// Add compound index on date and shift for filtering by both
dailyDeliverySchema.index({ date: 1, shift: 1 });

console.log(
  "DailyDelivery model created with shift support and optimized indices"
);
export const DailyDelivery = model<IDailyDelivery>(
  "DailyDelivery",
  dailyDeliverySchema
);
