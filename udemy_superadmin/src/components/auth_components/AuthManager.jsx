// // import React, { createContext, useState, useEffect, useContext } from "react";
// // import { Navigate } from "react-router-dom";

// // // 🔐 Create Context
// // export const AuthContext = createContext();

// // // 🔐 Auth Provider
// // export const AuthProvider = ({ children }) => {
// //   const [isLoggedIn, setIsLoggedIn] = useState(false);
// //   const [user, setUser] = useState(null);
// //   const [loading, setLoading] = useState(true);

// //   const decodeToken = (token) => {
// //     try {
// //       const base64Url = token.split(".")[1];
// //       const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
// //       return JSON.parse(atob(base64));
// //     } catch (error) {
// //       console.error("Token decoding failed:", error);
// //       return null;
// //     }
// //   };

// //   useEffect(() => {
// //     const token = localStorage.getItem("token");
// //     if (token) {
// //       const decoded = decodeToken(token);
// //       if (decoded) {
// //         setUser(decoded);
// //         setIsLoggedIn(true);
// //       }
// //     } else {
// //       setUser(null);
// //       setIsLoggedIn(false);
// //     }
// //     setLoading(false);
// //   }, []);

// //   const login = (token) => {
// //     // strip accidental 'Bearer ' prefix and quotes before saving
// //     const clean = String(token)
// //       .replace(/^Bearer\s+/i, "")
// //       .replace(/^"(.+)"$/, "$1");
// //     localStorage.setItem("token", clean);

// //     const decoded = decodeToken(clean);
// //     if (decoded) {
// //       setUser(decoded);
// //       setIsLoggedIn(true);
// //     } else {
// //       // if somehow not decodable, clear it
// //       localStorage.removeItem("token");
// //       setUser(null);
// //       setIsLoggedIn(false);
// //     }
// //   };

// //   const logout = () => {
// //     localStorage.removeItem("token");
// //     setUser(null);
// //     setIsLoggedIn(false);
// //   };

// //   return (
// //     <AuthContext.Provider value={{ isLoggedIn, user, login, logout, loading }}>
// //       {children}
// //     </AuthContext.Provider>
// //   );
// // };

// // // 🔒 Private Route
// // export const PrivateRoute = ({ children, allowedRoles = [] }) => {
// //   const { isLoggedIn, user, loading } = useContext(AuthContext);

// //   if (loading) return <div>Loading...</div>;

// //   if (!isLoggedIn) {
// //     return (
// //       <Navigate
// //         to="/login"
// //         replace
// //         state={{ message: "You need to log in to access this page." }}
// //       />
// //     );
// //   }

// //   if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
// //     return (
// //       <Navigate
// //         to="/dashboard"
// //         replace
// //         state={{ message: "You do not have permission to access this page." }}
// //       />
// //     );
// //   }

// //   return children;
// // };

// // // Updated Public Route with Role-Based Redirection
// // export const PublicRoute = ({ children }) => {
// //   const { isLoggedIn, user } = useContext(AuthContext);

// //   if (isLoggedIn && user?.role) {
// //     switch (user.role) {
// //       case "admin":
// //         return <Navigate to="/admin-dashboard" />;
// //       case "superadmin":
// //         return <Navigate to="/superadmin-dashboard" />;
// //       case "employee":
// //         return <Navigate to="/employee-dashboard" />;
// //       case "vendor":
// //         return <Navigate to="/vendor-dashboard" />;
// //       case "delivery_agent":
// //         return <Navigate to="/delivery-agent-dashboard" />;
// //       case "outlet":
// //         return <Navigate to="/outlet-dashboard" />;
// //       case "user":
// //       default:
// //         return <Navigate to="/dashboard" />;
// //     }
// //   }

// //   return children;
// // };

// //

// import React, { createContext, useState, useEffect, useContext } from "react";
// import { Navigate } from "react-router-dom";

// // 🔐 Create Context
// export const AuthContext = createContext();

// // 🔐 Auth Provider
// export const AuthProvider = ({ children }) => {
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const decodeToken = (token) => {
//     try {
//       const base64Url = token.split(".")[1];
//       const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
//       return JSON.parse(atob(base64));
//     } catch (error) {
//       console.error("Token decoding failed:", error);
//       return null;
//     }
//   };

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (token) {
//       const decoded = decodeToken(token);
//       if (decoded) {
//         // ⛔ if expired, clear it and exit
//         if (
//           typeof decoded.exp === "number" &&
//           Date.now() >= decoded.exp * 1000
//         ) {
//           localStorage.removeItem("token");
//           setUser(null);
//           setIsLoggedIn(false);
//           setLoading(false);
//           return;
//         }
//         setUser(decoded);
//         setIsLoggedIn(true);
//       } else {
//         setUser(null);
//         setIsLoggedIn(false);
//       }
//     } else {
//       setUser(null);
//       setIsLoggedIn(false);
//     }
//     setLoading(false);
//   }, []);

//   const login = (token) => {
//     // strip accidental 'Bearer ' prefix and quotes before saving
//     const clean = String(token)
//       .replace(/^Bearer\s+/i, "")
//       .replace(/^"(.+)"$/, "$1");
//     localStorage.setItem("token", clean);

//     const decoded = decodeToken(clean);
//     if (decoded) {
//       // if expired right away, don't keep it
//       if (typeof decoded.exp === "number" && Date.now() >= decoded.exp * 1000) {
//         localStorage.removeItem("token");
//         setUser(null);
//         setIsLoggedIn(false);
//         return;
//       }
//       setUser(decoded);
//       setIsLoggedIn(true);
//     } else {
//       localStorage.removeItem("token");
//       setUser(null);
//       setIsLoggedIn(false);
//     }
//   };

//   const logout = () => {
//     localStorage.removeItem("token");
//     setUser(null);
//     setIsLoggedIn(false);
//   };

//   return (
//     <AuthContext.Provider value={{ isLoggedIn, user, login, logout, loading }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// // 🔒 Private Route
// export const PrivateRoute = ({ children, allowedRoles = [] }) => {
//   const { isLoggedIn, user, loading } = useContext(AuthContext);

//   if (loading) return <div>Loading...</div>;

//   if (!isLoggedIn) {
//     return (
//       <Navigate
//         to="/login"
//         replace
//         state={{ message: "You need to log in to access this page." }}
//       />
//     );
//   }

//   if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
//     return (
//       <Navigate
//         to="/dashboard"
//         replace
//         state={{ message: "You do not have permission to access this page." }}
//       />
//     );
//   }

//   return children;
// };

// // 🌐 Public Route with Role-Based Redirection
// export const PublicRoute = ({ children }) => {
//   const { isLoggedIn, user } = useContext(AuthContext);

//   if (isLoggedIn && user?.role) {
//     switch (user.role) {
//       case "admin":
//         return <Navigate to="/admin-dashboard" />;
//       case "superadmin":
//         return <Navigate to="/superadmin-dashboard" />;
//       case "employee":
//         return <Navigate to="/employee-dashboard" />;
//       case "vendor":
//         return <Navigate to="/vendor-dashboard" />;
//       case "delivery_agent":
//         return <Navigate to="/delivery-agent-dashboard" />;
//       case "outlet":
//         return <Navigate to="/outlet-dashboard" />;
//       case "user":
//       default:
//         return <Navigate to="/dashboard" />;
//     }
//   }

//   return children;
// };

// till here original.

//

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

const getCookie = (name) =>
  isBrowser
    ? document.cookie
        .split("; ")
        .find((p) => p.startsWith(name + "="))
        ?.split("=")[1]
    : null;

const getAnyToken = () => {
  if (!isBrowser) return null;
  // Try several keys you might be using across apps
  const ls =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("superadminToken");
  if (ls) return ls;
  const ss =
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("jwt") ||
    sessionStorage.getItem("accessToken");
  if (ss) return ss;
  // cookies
  return getCookie("token") || getCookie("jwt") || null;
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
      const t = getAnyToken();
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
  const initialToken = isBrowser ? getAnyToken() : null;
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
      if (e.key === "token" || e.key === "jwt" || e.key === "accessToken") {
        const t = getAnyToken();
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
    if (isBrowser) {
      localStorage.removeItem("token");
      localStorage.removeItem("jwt");
      localStorage.removeItem("accessToken");
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
      document.cookie =
        "jwt=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    }
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
  const t = getAnyToken();
  const d = t ? decodeToken(t) : null;
  return d?._id || d?.id || d?.userId || null;
};

export const getTokenUserRole = () => {
  if (!isBrowser) return null;
  const t = getAnyToken();
  const d = t ? decodeToken(t) : null;
  return d?.role || null;
};

export const getAuthorizationHeader = () => {
  if (!isBrowser) return {};
  const t = getAnyToken();
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
