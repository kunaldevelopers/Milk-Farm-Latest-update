import { Schema, model, Document } from "mongoose";
import { getSetting } from "./Settings";

interface DeliveryRecord {
  date: Date;
  status: "Delivered" | "Not Delivered";
  quantity: number;
  reason?: string;
}

interface BillingInfo {
  month: number;
  year: number;
  totalQuantity: number;
  totalAmount: number;
  isPaid: boolean;
}

interface IClient extends Document {
  name: string;
  number: string;
  location: string;
  timeShift: "AM" | "PM";
  pricePerLitre: number;
  quantity: number;
  priorityStatus: boolean;
  assignedStaff?: Schema.Types.ObjectId;
  deliveryStatus: "Pending" | "Delivered" | "Not Delivered";
  deliveryHistory: DeliveryRecord[];
  monthlyBilling: BillingInfo;
  deliveryNotes?: string;
}

const deliveryRecordSchema = new Schema<DeliveryRecord>({
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ["Delivered", "Not Delivered"],
    required: true,
  },
  quantity: { type: Number, required: true },
  reason: String,
});

const billingInfoSchema = new Schema<BillingInfo>({
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  totalQuantity: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  isPaid: { type: Boolean, default: false },
});

// Create the schema with dynamic validation
const clientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true },
    number: { type: String, required: true },
    location: { type: String, required: true },
    timeShift: {
      type: String,
      enum: ["AM", "PM"],
      required: true,
    },
    pricePerLitre: { type: Number, required: true },
    quantity: { type: Number, required: true },
    priorityStatus: { type: Boolean, default: false },
    assignedStaff: { type: Schema.Types.ObjectId, ref: "Staff" },
    deliveryStatus: {
      type: String,
      enum: ["Pending", "Delivered", "Not Delivered"],
      default: "Pending",
    },
    deliveryHistory: [deliveryRecordSchema],
    monthlyBilling: billingInfoSchema,
    deliveryNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Add dynamic validation before save
clientSchema.pre("validate", async function (next) {
  try {
    // Validate timeShift against settings
    const shifts = await getSetting("shifts");
    if (shifts && Array.isArray(shifts) && !shifts.includes(this.timeShift)) {
      const err = new Error(`TimeShift must be one of: ${shifts.join(", ")}`);
      return next(err);
    }

    // Validate deliveryStatus against settings
    const statuses = await getSetting("deliveryStatuses");
    if (
      statuses &&
      Array.isArray(statuses) &&
      !statuses.includes(this.deliveryStatus)
    ) {
      const err = new Error(
        `DeliveryStatus must be one of: ${statuses.join(", ")}`
      );
      return next(err);
    }

    next();
  } catch (error) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
});

export const Client = model<IClient>("Client", clientSchema);
