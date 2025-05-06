import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/api";
import { User, LoginCredentials, RegisterData, AuthResponse } from "../types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to validate JSON string
  const isValidJson = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Check if the user is on a mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  // Helper to validate token expiration
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 < Date.now();
    } catch (e) {
      console.error("[AUTH DEBUG] Error checking token expiration:", e);
      return true;
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    try {
      console.log("[AUTH DEBUG] Initializing auth state...");
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      console.log("[AUTH DEBUG] Token exists:", !!token);
      console.log("[AUTH DEBUG] User data exists:", !!savedUser);

      if (token && savedUser && isValidJson(savedUser)) {
        // Check token expiration
        if (isTokenExpired(token)) {
          console.log("[AUTH DEBUG] Token has expired, clearing auth state");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          const loginPath = isMobileDevice() ? "/staff-login" : "/login";
          navigate(loginPath);
          return;
        }

        const parsedUser = JSON.parse(savedUser);
        console.log("[AUTH DEBUG] Parsed user:", parsedUser);
        setUser(parsedUser);

        // Handle navigation if on login pages
        const currentPath = window.location.pathname;
        if (currentPath === "/login" || currentPath === "/staff-login") {
          const targetPath =
            parsedUser.role === "staff"
              ? isMobileDevice()
                ? "/staff-mobile"
                : "/staff"
              : "/admin";
          console.log(`[AUTH DEBUG] Redirecting to ${targetPath}`);
          navigate(targetPath);
        }
      } else {
        console.log("[AUTH DEBUG] No valid auth data found");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      }
    } catch (error) {
      console.error("[AUTH DEBUG] Error restoring auth state:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        console.log("[AUTH DEBUG] Login attempt:", {
          username: credentials.username,
          timestamp: new Date().toISOString(),
        });

        const response = await auth.login(credentials);
        console.log("[AUTH DEBUG] Login response status:", response.status);

        const { token, user } = response.data as AuthResponse;

        if (!token || !user) {
          throw new Error("Invalid response from server");
        }

        console.log("[AUTH DEBUG] Setting auth state...");
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);

        // Handle navigation based on user role and device type
        if (user.role === "admin") {
          console.log("[AUTH DEBUG] Navigating to admin dashboard");
          navigate("/admin");
        } else if (user.role === "staff") {
          const targetPath = isMobileDevice() ? "/staff-mobile" : "/staff";
          console.log(`[AUTH DEBUG] Navigating to ${targetPath}`);
          navigate(targetPath);
        }
      } catch (error: any) {
        console.error("[AUTH DEBUG] Login error:", error);
        console.error("[AUTH DEBUG] Error response:", error.response?.data);
        throw new Error(error.response?.data?.message || "Invalid credentials");
      }
    },
    [navigate]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      try {
        console.log("[AUTH DEBUG] Registration attempt");
        const response = await auth.register(data);

        const { token, user } = response.data as AuthResponse;

        if (!token || !user) {
          throw new Error("Invalid response from server");
        }

        console.log("[AUTH DEBUG] Registration successful");
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);

        // Navigate based on role
        const targetPath =
          user.role === "admin"
            ? "/admin"
            : isMobileDevice()
            ? "/staff-mobile"
            : "/staff";
        navigate(targetPath);
      } catch (error: any) {
        console.error("[AUTH DEBUG] Registration error:", error);
        throw new Error(error.response?.data?.message || "Registration failed");
      }
    },
    [navigate]
  );

  const logout = useCallback(() => {
    console.log("[AUTH DEBUG] Logging out user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);

    const targetPath = isMobileDevice() ? "/staff-login" : "/login";
    console.log(`[AUTH DEBUG] Redirecting to ${targetPath}`);
    navigate(targetPath);
  }, [navigate]);

  if (isLoading) {
    console.log("[AUTH DEBUG] Still loading auth state...");
    return null;
  }

  const contextValue = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  console.log("[AUTH DEBUG] Auth context state:", {
    isAuthenticated: !!user,
    userRole: user?.role,
    userId: user?._id,
  });

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
