import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/User";

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-password")
      .lean();

    // Transform the data to match frontend expectations
    const transformedAdmins = admins.map((admin) => ({
      _id: admin._id,
      name: admin.name,
      email: admin.username, // Map username to email for frontend
      role: admin.role,
    }));

    res.json(transformedAdmins);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admins" });
  }
};

export const addAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ username: email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await User.create({
      username: email, // Use email as username
      password: hashedPassword,
      name: name,
      role: "admin",
    });

    const adminResponse = {
      _id: admin._id,
      name: admin.name,
      email: admin.username,
      role: admin.role,
    };

    res.status(201).json(adminResponse);
  } catch (error) {
    console.error("Add admin error:", error);
    res.status(500).json({ message: "Failed to add admin" });
  }
};

export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting the last admin
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      return res.status(400).json({ message: "Cannot delete the last admin" });
    }

    const admin = await User.findByIdAndDelete(id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete admin" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to change password" });
  }
};
