import axios, { AxiosError } from "axios";
import { LoginCredentials, RegisterData } from "../types";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor with detailed logging
api.interceptors.request.use(
  (config) => {
    // Get the token directly from localStorage - make sure it exists
    const token = localStorage.getItem("token");

    console.log("[API DEBUG] Making request to:", config.url);
    console.log("[API DEBUG] Request method:", config.method?.toUpperCase());

    // Ensure config.headers exists
    config.headers = config.headers || {};

    if (token) {
      console.log(
        "[API DEBUG] Adding token to request:",
        token.substring(0, 15) + "..."
      );
      config.headers.Authorization = `Bearer ${token}`;

      // Get user role from localStorage for debugging
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          config.headers["X-User-Role"] = user.role;
          console.log("[API DEBUG] Added user role to headers:", user.role);
        }
      } catch (e) {
        console.error("[API DEBUG] Error parsing user data:", e);
      }
    } else {
      console.error(
        "[API DEBUG] No token found in localStorage - user not authenticated"
      );
      // Add temporary console log to help debug - remove in production
      console.log(
        "[API DEBUG] Available localStorage keys:",
        Object.keys(localStorage).join(", ")
      );
    }

    return config;
  },
  (error) => {
    console.error("[API DEBUG] Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor with detailed logging
api.interceptors.response.use(
  (response) => {
    console.log("[API DEBUG] Response from:", response.config.url);
    console.log("[API DEBUG] Status:", response.status);
    return response;
  },
  async (error: AxiosError) => {
    console.error("[API DEBUG] Response error:", {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      response: error.response?.data,
    });

    // Handle network errors
    if (!error.response) {
      console.error("[API DEBUG] Network error - no response received");
      return Promise.reject(
        new Error("Network error. Please check your connection.")
      );
    }

    if (error.response.status === 401) {
      console.warn("[API DEBUG] Authentication failed - clearing auth state");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const isMobileDevice = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      };

      // Force reload to clear any stale state
      window.location.href = isMobileDevice() ? "/staff-login" : "/login";
      return Promise.reject(new Error("Session expired. Please login again."));
    }

    // Return the error message from the server if available
    const message = (error.response?.data as any)?.message || error.message;
    return Promise.reject(new Error(message));
  }
);

// Auth endpoints
export const auth = {
  login: (credentials: LoginCredentials) =>
    api.post("/auth/login", credentials),
  register: (data: RegisterData) => api.post("/auth/register", data),
};

// Client endpoints with debugging
export const clients = {
  getAll: () => api.get("/clients"),
  getById: (id: string) => api.get(`/clients/${id}`),
  add: (data: any) => api.post("/clients", data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
  updateDeliveryStatus: (id: string, status: string, reason?: string) =>
    api.put(`/clients/${id}/delivery-status`, { status, reason }),
  markDelivered: (id: string) => api.post(`/staff/client/${id}/delivered`),
  markUndelivered: (id: string, reason?: string) =>
    api.post(`/staff/client/${id}/undelivered`, { reason }),
  getDashboardStats: (date?: Date) =>
    api.get("/clients/stats/dashboard", {
      params: { date: date?.toISOString() },
    }),
  getSalesHistory: (startDate: Date, endDate: Date) =>
    api.get("/clients/stats/sales-history", {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    }),
  getDetailedSales: (startDate: Date, endDate: Date) =>
    api.get("/clients/stats/detailed-sales", {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    }),
  getAssignedToStaff: (staffId: string, includeAll?: boolean) => {
    const trimmedId = staffId.trim();
    console.log(
      `[API DEBUG] getAssignedToStaff - Fetching clients for staff ID: ${trimmedId}`
    );

    // Construct and log the full URL
    const url = `/staff/${trimmedId}/assigned-clients${
      includeAll ? "?includeAll=true" : ""
    }`;
    console.log(
      `[API DEBUG] getAssignedToStaff - Full URL: ${API_BASE_URL}${url}`
    );

    return api.get(url).catch((error) => {
      console.error("[API DEBUG] getAssignedToStaff error:", error);
      throw error;
    });
  },
};

// Staff endpoints with debugging
export const staff = {
  getAll: () => api.get("/staff"),
  getById: (id: string) => api.get(`/staff/${id}`),
  getByUserId: (userId: string) => {
    if (!userId) {
      console.error("[API DEBUG] getByUserId called without userId");
      return Promise.reject(new Error("User ID is required"));
    }

    console.log(
      `[API DEBUG] getByUserId - Looking up staff for user ID: ${userId}`
    );
    return api.get(`/staff/user/${userId}`).catch((error) => {
      console.error("[API DEBUG] getByUserId error:", error);
      throw error;
    });
  },
  getAssignedClients: (id: string) => api.get(`/staff/${id}/assigned-clients`),
  getAllAssignments: () => {
    console.log("[API DEBUG] Getting all staff assignments at once");
    return api.get("/staff/assignments/all");
  },
  add: (data: any) => api.post("/staff", data),
  update: (id: string, data: any) => api.put(`/staff/${id}`, data),
  delete: (id: string) => api.delete(`/staff/${id}`),
  assignClient: (staffId: string, clientId: string) =>
    api.post("/staff/assign", { staffId, clientId }),
  unassignClient: (staffId: string, clientId: string) =>
    api.post("/staff/unassign", { staffId, clientId }),
  selectShift: (id: string, shift: string) => {
    console.log(
      `[API DEBUG] selectShift - Staff ${id} selecting ${shift} shift`
    );
    return api.post(`/staff/${id}/select-shift`, { shift });
  },
  updateAssignedClients: (id: string, shift: "AM" | "PM") => {
    console.log(
      `[API DEBUG] updateAssignedClients - Updating staff ${id} clients based on ${shift} shift`
    );
    return api.post(`/staff/${id}/update-assigned-clients`, { shift });
  },
  getSessionByDate: (id: string, date: string) => {
    console.log(
      `[API DEBUG] getSessionByDate - Getting session for staff ${id} on ${date}`
    );
    return api.get(`/staff/${id}/session/${date}`);
  },
  getDailyDeliveries: (staffId: string, date: string) =>
    api.get(`/staff/${staffId}/daily-deliveries?date=${date}`),
  markDailyDelivered: (staffId: string, clientId: string, date: string) =>
    api.post(`/staff/daily-deliveries`, {
      staffId,
      clientId,
      date,
    }),
  markDailyUndelivered: (
    staffId: string,
    clientId: string,
    reason: string,
    date: string
  ) =>
    api.post(`/staff/daily-undelivered`, {
      staffId,
      clientId,
      reason,
      date,
    }),
};

// Add Daily Deliveries API
export const dailyDeliveries = {
  getByDate: (date: string, shift?: string) => {
    console.log(
      `[API DEBUG] getByDate - Getting deliveries for ${date}, shift: ${
        shift || "All"
      }`
    );
    return api.get(`/daily-deliveries/${date}`, {
      params: { shift },
    });
  },
  getStaffDeliveries: (staffId: string, date: string) => {
    console.log(
      `[API DEBUG] getStaffDeliveries - Getting deliveries for staff ${staffId} on ${date}`
    );
    return api.get(`/daily-deliveries/staff/${staffId}/${date}`);
  },
  getStats: (date: string, shift?: string) => {
    console.log(
      `[API DEBUG] getStats - Getting stats for ${date}, shift: ${
        shift || "All"
      }`
    );
    return api.get(`/daily-deliveries/stats/${date}`, {
      params: { shift },
    });
  },
};

// Admin endpoints
export const admin = {
  getAll: () => api.get("/admin/admins"), // Changed from /admin to /admin/admins
  add: (data: any) => api.post("/admin/admins", data), // Changed from /admin to /admin/admins
  delete: (id: string) => api.delete(`/admin/admins/${id}`), // Changed path format
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put("/admin/change-password", { currentPassword, newPassword }),
  // New dashboard endpoints
  getDashboardData: (date?: string, shift?: string) =>
    api.get("/admin/dashboard", {
      params: { date, shift },
    }),
  getDeliveryHistory: (
    clientId: string,
    startDate?: string,
    endDate?: string
  ) =>
    api.get(`/admin/delivery-history/${clientId}`, {
      params: { startDate, endDate },
    }),
  getDeliveryTrends: (
    period?: "daily" | "weekly" | "monthly",
    startDate?: string,
    endDate?: string
  ) =>
    api.get("/admin/delivery-trends", {
      params: { period, startDate, endDate },
    }),
  getNonDeliveryReasons: (startDate?: string, endDate?: string) =>
    api.get("/admin/non-delivery-reasons", {
      params: { startDate, endDate },
    }),
};

export default api;
