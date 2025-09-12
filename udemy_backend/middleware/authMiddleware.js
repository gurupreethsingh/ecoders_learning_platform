// const jwt = require("jsonwebtoken");

// function extractBearerToken(req) {
//   const hdr = req.headers.authorization || req.headers.Authorization || "";
//   if (typeof hdr !== "string") return null;

//   const parts = hdr.trim().split(/\s+/);
//   let raw = parts.length === 1 ? parts[0] : parts[parts.length - 1];
//   if (!raw || raw.toLowerCase() === "bearer") return null;
//   raw = raw.replace(/^"(.+)"$/, "$1"); // strip surrounding quotes
//   return raw;
// }

// function normalizeUser(decoded) {
//   const role =
//     typeof decoded.role === "string" ? decoded.role.toLowerCase() : null;
//   const _id = decoded._id || decoded.id || decoded.userId;
//   const id = decoded.id || decoded._id || decoded.userId;
//   return { ...decoded, _id, id, role };
// }

// exports.verifyToken = (req, res, next) => {
//   try {
//     const token = extractBearerToken(req);
//     if (!token) {
//       return res.status(401).json({ message: "No token provided" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET, {
//       clockTolerance: 30,
//     });
//     const user = normalizeUser(decoded);

//     if (!user._id) {
//       return res.status(401).json({ message: "Token missing user id" });
//     }
//     req.user = user;
//     next();
//   } catch (err) {
//     if (err?.name === "TokenExpiredError") {
//       return res.status(401).json({ message: "Token expired" });
//     }
//     return res.status(403).json({ message: "Invalid token" });
//   }
// };

// exports.verifyTokenOptional = (req, _res, next) => {
//   try {
//     const token = extractBearerToken(req);
//     if (!token) {
//       req.user = null;
//       return next();
//     }
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = normalizeUser(decoded);
//     req.user = user._id ? user : null;
//     next();
//   } catch {
//     req.user = null;
//     next();
//   }
// };

// till here original code.

//

// udemy_backend/middleware/authMiddleware.js
// Verifies JWT from Authorization: Bearer <token>, cookie ("token"/"jwt"), or x-auth-token

const jwt = require("jsonwebtoken");

/** Extract a raw token from Authorization header */
function extractBearerToken(req) {
  const hdr = req.headers.authorization || req.headers.Authorization || "";
  if (typeof hdr !== "string") return null;

  // Accept "Bearer <token>", "<token>", or quoted token
  const parts = hdr.trim().split(/\s+/);
  let raw = parts.length === 1 ? parts[0] : parts[parts.length - 1];
  if (!raw || raw.toLowerCase() === "bearer") return null;
  raw = raw.replace(/^"(.+)"$/, "$1"); // strip surrounding quotes
  return raw;
}

/** Normalize decoded JWT into a consistent user object */
function normalizeUser(decoded) {
  const role =
    typeof decoded.role === "string" ? decoded.role.toLowerCase() : null;
  const _id = decoded._id || decoded.id || decoded.userId;
  const id = decoded.id || decoded._id || decoded.userId;
  return { ...decoded, _id, id, role };
}

exports.verifyToken = (req, res, next) => {
  try {
    // header OR cookie OR x-auth-token
    const fromHeader = extractBearerToken(req);
    const fromCookie =
      (req.cookies && (req.cookies.token || req.cookies.jwt)) || null;
    const fromHeaderAlt = req.headers["x-auth-token"];
    const token = fromHeader || fromHeaderAlt || fromCookie;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      clockTolerance: 30, // tolerate small clock skews
    });
    const user = normalizeUser(decoded);

    if (!user._id) {
      return res.status(401).json({ message: "Token missing user id" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(403).json({ message: "Invalid token" });
  }
};

exports.verifyTokenOptional = (req, _res, next) => {
  try {
    const fromHeader = extractBearerToken(req);
    const fromCookie =
      (req.cookies && (req.cookies.token || req.cookies.jwt)) || null;
    const fromHeaderAlt = req.headers["x-auth-token"];
    const token = fromHeader || fromHeaderAlt || fromCookie;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      clockTolerance: 30,
    });
    const user = normalizeUser(decoded);
    req.user = user._id ? user : null;
    next();
  } catch {
    req.user = null;
    next();
  }
};
