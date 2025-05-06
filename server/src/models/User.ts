import { Schema, model, Document, CallbackError } from "mongoose";
import bcrypt from "bcrypt";
import { getSetting } from "./Settings";

interface IUser extends Document {
  username: string;
  password: string;
  name: string;
  role: string;
  contactNumber?: string;
  location?: string;
  profilePhoto?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    contactNumber: String,
    location: String,
    profilePhoto: String,
  },
  {
    timestamps: true,
  }
);

// Add method to compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Add validation for roles
userSchema.pre("validate", async function (next) {
  try {
    // Validate role against settings
    const roles = await getSetting("roles");
    if (roles && Array.isArray(roles) && !roles.includes(this.role)) {
      const err = new Error(`Role must be one of: ${roles.join(", ")}`);
      return next(err);
    }

    next();
  } catch (error) {
    // Cast error to CallbackError type for Mongoose middleware
    next(error as CallbackError);
  }
});

export const User = model<IUser>("User", userSchema);
