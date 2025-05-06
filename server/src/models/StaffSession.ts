import { Schema, model, Document } from "mongoose";

interface IStaffSession extends Document {
  staffId: Schema.Types.ObjectId;
  shift: "AM" | "PM";
  date: Date;
}

const staffSessionSchema = new Schema<IStaffSession>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    shift: { type: String, enum: ["AM", "PM"], required: true },
    date: {
      type: Date,
      required: true,
      default: () => new Date().setHours(0, 0, 0, 0),
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index on staffId and date to ensure uniqueness per day
staffSessionSchema.index({ staffId: 1, date: 1 }, { unique: true });

console.log("StaffSession model created for tracking daily shift selections");
export const StaffSession = model<IStaffSession>(
  "StaffSession",
  staffSessionSchema
);

// Step 2 implemented: Created StaffSession model
