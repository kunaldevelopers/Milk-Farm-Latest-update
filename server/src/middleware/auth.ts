import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { User } from "../models/User";
import { IUserPayload } from "../types";

// JWT payload interface for type checking
export interface JWTPayload {
  _id: string;
  userId: string;
  username: string;
  role: string;
  name?: string;
}

// Add user property to Express Request
declare global {
  namespace Express {
    interface Request {
      user?: IUserPayload;
    }
  }
}

// Export the middleware function with proper RequestHandler typing
export const authMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("[AUTH DEBUG] No authorization header found");
    res.status(401).json({
      message: "Authentication required",
      details: "No authorization header",
    });
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.log("[AUTH DEBUG] Invalid authorization format");
    res.status(401).json({
      message: "Authentication failed",
      details: "Invalid token format",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

    // Find user and attach to request
    User.findById(decoded._id)
      .then((user) => {
        if (!user) {
          console.log("[AUTH DEBUG] User not found in database");
          res.status(401).json({
            message: "Authentication failed",
            details: "User not found",
          });
          return;
        }

        // Convert MongoDB ObjectId to string for consistent typing
        req.user = {
          _id: decoded._id.toString(),
          userId: decoded.userId.toString(),
          username: decoded.username,
          role: decoded.role as "admin" | "staff",
          name: decoded.name,
        };

        next();
      })
      .catch((error) => {
        console.error("[AUTH DEBUG] Database query error:", error);
        res.status(500).json({
          message: "Authentication failed",
          details: "Database error",
        });
      });
  } catch (error) {
    console.error("[AUTH DEBUG] Auth middleware error:", error);

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        message: "Authentication failed",
        details: "Token has expired",
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        message: "Authentication failed",
        details: "Invalid token",
      });
      return;
    }

    res.status(401).json({
      message: "Authentication failed",
      details: "Token verification failed",
    });
    return;
  }
};
