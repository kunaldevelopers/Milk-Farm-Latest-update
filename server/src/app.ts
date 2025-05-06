import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { clientRouter } from "./routes/client";
import { staffRouter } from "./routes/staff";
import { adminRouter } from "./routes/admin";
import { dailyDeliveriesRouter } from "./routes/dailyDeliveries";
import { config } from "./config";
import { initializeDummyUsers } from "./scripts/createDummyUsers";
import { initializeDefaultSettings } from "./models/Settings";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    exposedHeaders: ["Authorization", "X-User-Role"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-User-Role"],
  })
);
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body,
  });
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes - Order matters! More specific routes should come first
app.use("/api/admin", adminRouter); // Admin routes first
app.use("/api/auth", authRouter);
app.use("/api/clients", clientRouter);
app.use("/api/staff", staffRouter);
app.use("/api/daily-deliveries", dailyDeliveriesRouter); // Add daily deliveries routes

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something broke!" });
});

// Connect to MongoDB and initialize
mongoose
  .connect(config.mongoUri)
  .then(async () => {
    // Extract database name for logging
    const dbName = config.mongoUri.split("/").pop();
    console.log(`Connected to MongoDB database: ${dbName}`);

    // Check if connection and db exist
    if (!mongoose.connection || !mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    // Log collections for clarity
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      `Available collections: ${collections.map((c) => c.name).join(", ")}`
    );

    // Initialize default system settings
    await initializeDefaultSettings();

    // Initialize dummy users after successful connection
    try {
      await initializeDummyUsers();
      console.log("✓ Database initialization completed");
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
    }

    // Start server after initialization
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
