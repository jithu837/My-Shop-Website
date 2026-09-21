import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token") || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("admin_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setToken(null);
    setUser(null);
  }, []);

  // Validate existing token on initial application load
  useEffect(() => {
    let isMounted = true;
    const initialToken = localStorage.getItem("admin_token");

    if (!initialToken) {
      setIsLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        if (isMounted && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem("admin_user", JSON.stringify(res.data.user));
        }
      })
      .catch((err) => {
        // If 401 or token corrupted, logout cleanly
        if (err.response?.status === 401) {
          logout();
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [logout]);

  // Listen for unauthorized events emitted by Axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("admin:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("admin:unauthorized", handleUnauthorized);
  }, [logout]);

  const login = async (phone, password) => {
    const res = await api.post("/auth/login", { phone, password });
    if (res.data?.success && res.data?.token) {
      const authToken = res.data.token;
      const authUser = res.data.user;

      localStorage.setItem("admin_token", authToken);
      localStorage.setItem("admin_user", JSON.stringify(authUser));

      setToken(authToken);
      setUser(authUser);
      return res.data;
    }
    throw new Error(res.data?.message || "Login failed");
  };

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
