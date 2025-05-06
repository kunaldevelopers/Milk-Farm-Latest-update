import { Document, Types } from "mongoose";
import { Request } from "express";
import { JWTPayload } from "../middleware/auth";

export interface IUser extends Document {
  username: string;
  password: string;
  role: "admin" | "staff";
  name?: string;
  contactNumber?: string;
  location?: string;
  profilePhoto?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Ensure this interface matches data stored in User documents
export interface IUserPayload {
  _id: string;
  userId: string;
  username: string;
  role: "admin" | "staff";
  name?: string;
}

export interface IClient extends Document {
  name: string;
  number: string;
  location: string;
  timeShift: "AM" | "PM";
  pricePerLitre: number;
  quantity: number;
  priorityStatus: boolean;
  assignedStaff?: Types.ObjectId;
  deliveryStatus: "Pending" | "Delivered" | "Not Delivered";
  deliveryHistory: IDeliveryRecord[];
  monthlyBilling: IBillingInfo;
  deliveryNotes?: string; // Added to fix TypeScript error
}

export interface IDeliveryRecord {
  date: Date;
  status: "Delivered" | "Not Delivered";
  quantity: number;
  reason?: string;
}

export interface IBillingInfo {
  month: number;
  year: number;
  totalQuantity: number;
  totalAmount: number;
  isPaid: boolean;
}

export interface IStaff extends Document {
  userId: Types.ObjectId;
  name: string; // Adding name field to match usage in code
  shift: "AM" | "PM";
  assignedClients: Types.ObjectId[];
  totalMilkQuantity: number;
  isAvailable: boolean;
  lastDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  contactNumber?: string; // Adding optional fields used in the code
  location?: string;
}

export interface AuthRequest extends Request {
  user?: IUserPayload; // Updated to use IUserPayload instead of JWTPayload
}

// TypeScript typing ensured for IUser, IClient, IStaff
