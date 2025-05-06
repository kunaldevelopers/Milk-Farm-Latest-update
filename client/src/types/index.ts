export interface User {
  _id: string;
  username: string;
  name: string;
  role: "admin" | "staff";
  contactNumber?: string;
  location?: string;
  profilePhoto?: string;
}

export interface DeliveryRecord {
  date: Date;
  status: "Delivered" | "Not Delivered";
  quantity: number;
  reason?: string;
}

export interface BillingInfo {
  month: number;
  year: number;
  totalQuantity: number;
  totalAmount: number;
  isPaid: boolean;
}

export interface Client {
  _id: string;
  name: string;
  number: string;
  location: string;
  timeShift: "AM" | "PM";
  pricePerLitre: number;
  quantity: number;
  priorityStatus: boolean;
  assignedStaff?: string;
  deliveryStatus: "Delivered" | "Not Delivered";
  deliveryHistory: DeliveryRecord[];
  monthlyBilling: BillingInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface Staff {
  _id: string;
  userId: string;
  username: string;
  name: string;
  contactNumber?: string;
  location?: string;
  shift: "AM" | "PM";
  assignedClients: string[];
  totalMilkQuantity: number;
  isAvailable: boolean;
  lastDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  staffId: string;
  clientId: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  role?: "admin" | "staff";
  contactNumber?: string;
  location?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface StaffSession {
  _id: string;
  staffId: string;
  shift: "AM" | "PM";
  date: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DailyDelivery {
  _id: string;
  clientId: string | Client;
  staffId: string | Staff;
  date: string;
  shift: "AM" | "PM";
  deliveryStatus: "Delivered" | "Not Delivered";
  quantity: number;
  price: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isPending?: boolean;
}

export interface DailyStats {
  date: string;
  shift: string;
  totalDeliveries: number;
  totalDelivered: number;
  totalNotDelivered: number;
  totalQuantity: number;
  totalRevenue: number;
  deliveryPercentage: number;
}
