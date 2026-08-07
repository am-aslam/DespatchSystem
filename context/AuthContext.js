"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";

export const SALESPERSONS = [];
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [setupAccount, setSetupAccount] = useState(null); // Held during first-time password setup
  const [salespeople, setSalespeople] = useState([]);

  // Inactivity timeout handler (30 minutes)
  const lastActivityRef = useRef(0);

  const logout = useCallback(() => {
    const authToken = localStorage.getItem("aurum_auth_token");
    if (authToken) {
      axios.post("/api/auth/logout").catch(() => {});
    }

    setCurrentUser(null);
    setToken(null);
    setSetupAccount(null);
    setSalespeople([]);
    localStorage.removeItem("aurum_auth_token");
    delete axios.defaults.headers.common["Authorization"];
  }, []);

  const refreshSalespeople = useCallback(async () => {
    try {
      const res = await axios.get("/api/users?role=SALESPERSON");
      if (res.data?.success) {
        setSalespeople(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch salesperson accounts:", err);
      setSalespeople([]);
    }
  }, []);

  // Update activity timestamp on user interaction
  useEffect(() => {
    lastActivityRef.current = Date.now();
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    const interval = setInterval(() => {
      if (currentUser && Date.now() - lastActivityRef.current > INACTIVITY_LIMIT_MS) {
        logout();
      }
    }, 60000);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      clearInterval(interval);
    };
  }, [currentUser, logout]);

  // Load session from stored token on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      const storedToken = localStorage.getItem("aurum_auth_token");
      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        axios
          .get("/api/auth/me")
          .then((res) => {
            if (res.data?.success && res.data?.data?.user) {
              setCurrentUser(res.data.data.user);
            } else {
              logout();
            }
          })
          .catch(() => logout())
          .finally(() => setIsInitialized(true));
      } else {
        setIsInitialized(true);
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [logout]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER") {
        refreshSalespeople();
      } else {
        setSalespeople([]);
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [currentUser?.id, currentUser?.role, refreshSalespeople]);

  // Login handler using Employee ID & Password
  const login = async (employeeId, password) => {
    try {
      const res = await axios.post("/api/auth/login", {
        employee_id: employeeId,
        password: password,
      });

      if (res.data?.success) {
        const data = res.data.data;

        // Check if first-time password setup is required
        if (data.requires_setup) {
          setSetupAccount({
            employee_id: data.employee_id,
            full_name: data.full_name,
            role: data.role,
          });
          return { requiresSetup: true, message: res.data.message };
        }

        // Normal Login Success
        const authToken = data.token;
        const userObj = data.user;

        setToken(authToken);
        setCurrentUser(userObj);
        localStorage.setItem("aurum_auth_token", authToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;

        return { success: true, user: userObj };
      } else {
        return { success: false, error: res.data?.message || "Login failed" };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to log in";
      return { success: false, error: errorMsg };
    }
  };

  // First-time password setup handler
  const handleSetupPassword = async (employeeId, newPassword, confirmPassword) => {
    try {
      const res = await axios.post("/api/auth/setup-password", {
        employee_id: employeeId,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.data?.success) {
        setSetupAccount(null);
        return { success: true, message: res.data.message };
      } else {
        return { success: false, error: res.data?.message || "Password setup failed" };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to setup password";
      return { success: false, error: errorMsg };
    }
  };

  // Change password handler
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const res = await axios.post("/api/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.data?.success) {
        return { success: true, message: res.data.message };
      } else {
        return { success: false, error: res.data?.message || "Password change failed" };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to change password";
      return { success: false, error: errorMsg };
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const isSalesperson = currentUser?.role === "SALESPERSON";
  const salespersonNames = useMemo(
    () => salespeople.map((user) => user.full_name || user.name).filter(Boolean),
    [salespeople]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isInitialized,
        setupAccount,
        setSetupAccount,
        login,
        handleSetupPassword,
        changePassword,
        logout,
        salespeople,
        salespersonNames,
        refreshSalespeople,
        isAdmin,
        isManager,
        isSalesperson,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
