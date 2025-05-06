import { Schema, model, Document } from "mongoose";

// Interface for system settings
export interface ISystemSettings extends Document {
  settingKey: string;
  settingValue: string | string[] | boolean | number;
  description?: string;
  category: string;
  isActive: boolean;
}

// Schema for system settings
const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    settingKey: { type: String, required: true, unique: true },
    settingValue: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    category: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Create model
export const SystemSettings = model<ISystemSettings>(
  "SystemSettings",
  systemSettingsSchema
);

// Helper function to get settings by key
export const getSetting = async (key: string): Promise<any> => {
  const setting = await SystemSettings.findOne({
    settingKey: key,
    isActive: true,
  });
  return setting ? setting.settingValue : null;
};

// Default settings
export const defaultSettings = {
  shifts: ["AM", "PM"],
  roles: ["admin", "staff"],
  defaultRole: "staff",
  defaultShift: "AM",
  deliveryStatuses: ["Delivered", "Not Delivered", "Pending"],
  // ...any other settings
};

// Helper function to initialize default system settings
export const initializeDefaultSettings = async (): Promise<void> => {
  // Define default settings
  const defaultSettings = [
    {
      settingKey: "shifts",
      settingValue: ["AM", "PM"],
      description: "Available shift options",
      category: "delivery",
    },
    {
      settingKey: "deliveryStatuses",
      settingValue: ["Pending", "Delivered", "Not Delivered"],
      description: "Available delivery status options",
      category: "delivery",
    },
    {
      settingKey: "roles",
      settingValue: ["admin", "staff"],
      description: "User roles in the system",
      category: "user",
    },
    {
      settingKey: "defaultShift",
      settingValue: "AM",
      description: "Default shift for new staff",
      category: "delivery",
    },
    {
      settingKey: "defaultRole",
      settingValue: "staff",
      description: "Default role for new users",
      category: "user",
    },
  ];

  // Check and insert each setting if it doesn't exist
  for (const setting of defaultSettings) {
    const exists = await SystemSettings.findOne({
      settingKey: setting.settingKey,
    });
    if (!exists) {
      await SystemSettings.create(setting);
      console.log(`Created setting: ${setting.settingKey}`);
    }
  }

  console.log("✓ Default system settings initialized");
};
