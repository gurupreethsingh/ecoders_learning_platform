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
//         setUser(decoded);
//         setIsLoggedIn(true);
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
//       setUser(decoded);
//       setIsLoggedIn(true);
//     } else {
//       // if somehow not decodable, clear it
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

// // Updated Public Route with Role-Based Redirection
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

//

import React, { createContext, useState, useEffect, useContext } from "react";
import { Navigate } from "react-router-dom";

// 🔐 Create Context
export const AuthContext = createContext();

// 🔐 Auth Provider
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const decodeToken = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(base64));
    } catch (error) {
      console.error("Token decoding failed:", error);
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        // ⛔ if expired, clear it and exit
        if (
          typeof decoded.exp === "number" &&
          Date.now() >= decoded.exp * 1000
        ) {
          localStorage.removeItem("token");
          setUser(null);
          setIsLoggedIn(false);
          setLoading(false);
          return;
        }
        setUser(decoded);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } else {
      setUser(null);
      setIsLoggedIn(false);
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    // strip accidental 'Bearer ' prefix and quotes before saving
    const clean = String(token)
      .replace(/^Bearer\s+/i, "")
      .replace(/^"(.+)"$/, "$1");
    localStorage.setItem("token", clean);

    const decoded = decodeToken(clean);
    if (decoded) {
      // if expired right away, don't keep it
      if (typeof decoded.exp === "number" && Date.now() >= decoded.exp * 1000) {
        localStorage.removeItem("token");
        setUser(null);
        setIsLoggedIn(false);
        return;
      }
      setUser(decoded);
      setIsLoggedIn(true);
    } else {
      localStorage.removeItem("token");
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 🔒 Private Route
export const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { isLoggedIn, user, loading } = useContext(AuthContext);

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

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
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

// 🌐 Public Route with Role-Based Redirection
export const PublicRoute = ({ children }) => {
  const { isLoggedIn, user } = useContext(AuthContext);

  if (isLoggedIn && user?.role) {
    switch (user.role) {
      case "admin":
        return <Navigate to="/admin-dashboard" />;
      case "superadmin":
        return <Navigate to="/superadmin-dashboard" />;
      case "employee":
        return <Navigate to="/employee-dashboard" />;
      case "vendor":
        return <Navigate to="/vendor-dashboard" />;
      case "delivery_agent":
        return <Navigate to="/delivery-agent-dashboard" />;
      case "outlet":
        return <Navigate to="/outlet-dashboard" />;
      case "user":
      default:
        return <Navigate to="/dashboard" />;
    }
  }

  return children;
};
