import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/User";
import { Staff } from "../models/Staff";
import { config } from "../config";
import mongoose, { Document, Types } from "mongoose";
import { IUser, IUserPayload } from "../types";

interface UserDocument extends Document {
  _id: Types.ObjectId;
  username: string;
  password: string;
  role: "admin" | "staff";
  name?: string;
}

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    console.log(`[AUTH DEBUG] Login attempt for username: ${username}`);

    // Explicitly type user with UserDocument interface
    const user = (await User.findOne({ username })) as UserDocument | null;

    if (!user) {
      console.log(`[AUTH DEBUG] User not found: ${username}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`[AUTH DEBUG] Invalid password for user: ${username}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // If this is a staff user, ensure they have a staff record
    if (user.role === "staff") {
      console.log(`[AUTH DEBUG] Checking staff record for user: ${user._id}`);

      // Try different methods to find the staff record
      let existingStaff = await Staff.findOne({ userId: user._id });

      if (!existingStaff) {
        // Try string comparison as fallback
        existingStaff = await Staff.findOne({
          $expr: {
            $eq: [{ $toString: "$userId" }, user._id.toString()],
          },
        });
      }

      if (!existingStaff) {
        console.log(
          `[AUTH DEBUG] Creating new staff record for user: ${user._id}`
        );
        try {
          const newStaff = new Staff({
            userId: new Types.ObjectId(user._id.toString()),
            name: user.name || user.username,
            shift: "AM", // Default shift
            assignedClients: [],
            isAvailable: true,
            totalMilkQuantity: 0,
          });
          await newStaff.save();
          console.log(
            `[AUTH DEBUG] Created staff record with ID: ${newStaff._id}`
          );
        } catch (staffError) {
          console.error(
            `[AUTH DEBUG] Error creating staff record:`,
            staffError
          );
          return res.status(500).json({
            message: "Error creating staff record",
            error:
              staffError instanceof Error
                ? staffError.message
                : "Unknown error",
          });
        }
      } else {
        console.log(
          `[AUTH DEBUG] Found existing staff record: ${existingStaff._id}`
        );
        // Ensure userId is correct format
        if (existingStaff.userId.toString() !== user._id.toString()) {
          existingStaff.userId = new Types.ObjectId(user._id.toString());
          await existingStaff.save();
          console.log(
            `[AUTH DEBUG] Updated staff record userId to: ${user._id}`
          );
        }
      }
    }

    // Create properly typed token payload
    const tokenPayload: IUserPayload = {
      _id: user._id.toString(),
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name || undefined,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: "24h",
    });

    console.log(`[AUTH DEBUG] Login successful for user: ${username}`);
    res.json({
      token,
      user: {
        _id: user._id.toString(),
        username: user.username,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("[AUTH DEBUG] Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, role, name } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with proper type casting
    const user = (await User.create({
      username,
      password: hashedPassword,
      role: role || "staff",
      name,
    })) as UserDocument;

    // Create properly typed token payload
    const tokenPayload: IUserPayload = {
      _id: user._id.toString(),
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: "24h",
    });

    res.status(201).json({
      token,
      user: {
        _id: user._id.toString(),
        username: user.username,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
