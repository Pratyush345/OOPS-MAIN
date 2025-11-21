import React, { createContext, useState, useContext, useEffect } from "react";
import { dashboardAPI } from "@/api/api";   // ⭐ FIXED — correct API
import { authAPI } from "@/api/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ⭐ GLOBAL RETAILER STATS (realtime)
  const [retailerStats, setRetailerStats] = useState({
    orders: 0,
    revenue: 0,
  });

  // ------------------------------------------------------
  // LOAD USER FROM LOCAL STORAGE
  // ------------------------------------------------------
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      setToken(storedToken);

      // Load retailer stats if needed
      if (u.role === "retailer") {
        loadRetailerStats(u.id);
      }
    }

    setLoading(false);
  }, []);

  // ------------------------------------------------------
  //  ⭐ FIXED — REAL RETAILER STATS LOADER
  // ------------------------------------------------------
  const loadRetailerStats = async (sellerId) => {
    if (!sellerId) return;

    try {
      const res = await dashboardAPI.getRetailerDashboard(sellerId);
      const stats = res.data ?? res;

      setRetailerStats({
        orders: stats.orders_count,
        revenue: stats.total_revenue,
      });

    } catch (err) {
      console.error("⚠ Error loading retailer stats:", err);
    }
  };

  // ------------------------------------------------------
  // LOGIN
  // ------------------------------------------------------
  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);

    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));

    if (userData.role === "retailer") {
      loadRetailerStats(userData.id);
    }
  };

  // ------------------------------------------------------
  // LOGOUT
  // ------------------------------------------------------
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // ------------------------------------------------------
  // UPDATE USER
  // ------------------------------------------------------
  const updateUser = (data) => {
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  // ------------------------------------------------------
  // PROVIDER
  // ------------------------------------------------------
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,

        // ⭐ retailer stats + loader
        retailerStats,
        loadRetailerStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
