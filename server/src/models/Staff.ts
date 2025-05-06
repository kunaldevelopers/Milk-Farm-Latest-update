import { Schema, model, Document, Types } from "mongoose";

interface IStaff extends Document {
  userId: Types.ObjectId;
  name: string;
  contactNumber?: string;
  location?: string;
  // shift field removed - now using StaffSession model for shift tracking
  assignedClients: Types.ObjectId[];
  totalMilkQuantity: number;
  isAvailable: boolean;
  lastDeliveryDate?: Date;
}

const staffSchema = new Schema<IStaff>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    contactNumber: String,
    location: String,
    // shift field removed - now using StaffSession model for shift tracking
    assignedClients: [{ type: Schema.Types.ObjectId, ref: "Client" }],
    totalMilkQuantity: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    lastDeliveryDate: Date,
  },
  {
    timestamps: true, // This will add createdAt and updatedAt fields automatically
  }
);

staffSchema.pre("save", async function (next) {
  if (this.isModified("assignedClients")) {
    const Client = model("Client");
    const clients = await Client.find({ _id: { $in: this.assignedClients } });
    this.totalMilkQuantity = clients.reduce(
      (total, client) => total + client.quantity,
      0
    );
  }
  next();
});

export const Staff = model<IStaff>("Staff", staffSchema);
