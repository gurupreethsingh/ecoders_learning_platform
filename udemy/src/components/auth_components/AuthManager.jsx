// udemy_superadmin/src/components/auth_components/AuthManager.jsx
// Client-side auth manager for React apps (JWT + Axios header + route guards)

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

/* =========================
 * Utils
 * =======================*/

const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

// Robust token decoder (browser + SSR safe, no external deps)
export const decodeToken = (token) => {
  try {
    if (!token || typeof token !== "string" || !token.includes("."))
      return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = isBrowser
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
};

// Manage Axios default Authorization header
const setAxiosAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
};

// Add exactly one Axios request interceptor (even with HMR/fast refresh)
if (isBrowser && !window.__AXIOS_AUTH_INTERCEPTOR_ADDED__) {
  axios.interceptors.request.use((config) => {
    if (!config.headers?.Authorization) {
      const t = localStorage.getItem("token");
      if (t) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${t}`;
      }
    }
    return config;
  });
  window.__AXIOS_AUTH_INTERCEPTOR_ADDED__ = true;
}

/* =========================
 * React Context
 * =======================*/

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const initialToken = isBrowser ? localStorage.getItem("token") : null;
  const initialUser = initialToken ? decodeToken(initialToken) : null;

  const [token, setToken] = useState(initialToken);
  const [user, setUser] = useState(initialUser);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(initialUser));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAxiosAuthHeader(token);
    setIsLoggedIn(Boolean(user));
    setLoading(false);

    if (!isBrowser) return;

    const onStorage = (e) => {
      if (e.key === "token") {
        const t = localStorage.getItem("token");
        const decoded = t ? decodeToken(t) : null;
        setToken(t || null);
        setUser(decoded);
        setAxiosAuthHeader(t);
        setIsLoggedIn(Boolean(decoded));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (newToken) => {
    if (isBrowser) localStorage.setItem("token", newToken);
    setToken(newToken);
    const decoded = decodeToken(newToken);
    setUser(decoded);
    setIsLoggedIn(Boolean(decoded));
    setAxiosAuthHeader(newToken);
  };

  const logout = () => {
    if (isBrowser) localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setAxiosAuthHeader(null);
  };

  const userId = useMemo(() => {
    if (!user) return null;
    return user._id || user.id || user.userId || null;
  }, [user]);

  const role = useMemo(() => (user ? user.role || null : null), [user]);

  const value = useMemo(
    () => ({
      loading,
      isLoggedIn,
      user,
      userId,
      role,
      token,
      login,
      logout,
    }),
    [loading, isLoggedIn, user, userId, role, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/* =========================
 * Hooks & Helpers
 * =======================*/

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};

export const getTokenUserId = () => {
  if (!isBrowser) return null;
  const t = localStorage.getItem("token");
  const d = t ? decodeToken(t) : null;
  return d?._id || d?.id || d?.userId || null;
};

export const getTokenUserRole = () => {
  if (!isBrowser) return null;
  const t = localStorage.getItem("token");
  const d = t ? decodeToken(t) : null;
  return d?.role || null;
};

export const getAuthorizationHeader = () => {
  if (!isBrowser) return {};
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/* =========================
 * Route Guards (React Router v6+)
 * =======================*/

export const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { loading, isLoggedIn, role } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: "You need to log in to access this page." }}
      />
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ message: "You do not have permission to access this page." }}
      />
    );
  }

  return children;
};

export const PublicRoute = ({ children }) => {
  const { isLoggedIn, role } = useAuth();

  if (isLoggedIn && role) {
    switch (role) {
      case "student":
        return <Navigate to="/student-dashboard" replace />;
      case "instructor":
        return <Navigate to="/instructor-dashboard" replace />;
      case "superadmin":
        return <Navigate to="/superadmin-dashboard" replace />;
      case "admin":
        return <Navigate to="/admin-dashboard" replace />;
      default:
        return <Navigate to="/user-dashboard" replace />;
    }
  }

  return children;
};
