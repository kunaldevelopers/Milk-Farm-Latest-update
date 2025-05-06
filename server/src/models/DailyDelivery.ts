import { Schema, model, Document } from "mongoose";

interface IDailyDelivery extends Document {
  clientId: Schema.Types.ObjectId;
  staffId: Schema.Types.ObjectId;
  date: Date;
  shift: "AM" | "PM";
  deliveryStatus: "Delivered" | "Not Delivered";
  quantity: number;
  price: number;
  notes?: string;
}

const dailyDeliverySchema = new Schema<IDailyDelivery>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    date: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      },
    },
    shift: { type: String, enum: ["AM", "PM"], required: true },
    deliveryStatus: {
      type: String,
      enum: ["Delivered", "Not Delivered"],
      default: "Not Delivered",
    },
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Create a compound index on clientId, date and shift to ensure uniqueness per shift
dailyDeliverySchema.index({ clientId: 1, date: 1, shift: 1 }, { unique: true });

// Add index on date and staffId for better staff delivery queries
dailyDeliverySchema.index({ date: 1, staffId: 1 });

// Add index on delivery status for filtering
dailyDeliverySchema.index({ deliveryStatus: 1 });

// Pre-save middleware to ensure date is always normalized to midnight
dailyDeliverySchema.pre("save", function (next) {
  if (this.isModified("date")) {
    const d = new Date(this.date);
    d.setHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

export const DailyDelivery = model<IDailyDelivery>(
  "DailyDelivery",
  dailyDeliverySchema
);
