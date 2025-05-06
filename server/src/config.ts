import dotenv from "dotenv";

dotenv.config();

export const config = {
  mongoUri:
    process.env.MONGODB_URI || "mongodb://localhost:27017/milk-farm-crm-2",
  jwtSecret: process.env.JWT_SECRET || "milk-farm-secret",
  jwtExpiration: "24h",
};
