"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

export const SALESPERSONS = [
  "SIJI CMS",
  "MHD SHAMIL",
  "SHAMIL VK",
  "BABU",
  "SHAMEER",
];

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [setupAccount, setSetupAccount] = useState(null); // Held during first-time password setup

  // Inactivity timeout handler (30 minutes)
  const INACTIVITY_LIMIT = 30 * 60 * 1000;
  const [lastActivity, setLastActivity] = useState(Date.now());

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    setSetupAccount(null);
    localStorage.removeItem("aurum_auth_token");
    delete axios.defaults.headers.common["Authorization"];
  }, []);

  // Update activity timestamp on user interaction
  useEffect(() => {
    const handleUserActivity = () => setLastActivity(Date.now());
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    const interval = setInterval(() => {
      if (currentUser && Date.now() - lastActivity > INACTIVITY_LIMIT) {
        logout();
      }
    }, 60000);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      clearInterval(interval);
    };
  }, [currentUser, lastActivity, logout]);

  // Load session from stored token on mount
  useEffect(() => {
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
  }, [logout]);

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
