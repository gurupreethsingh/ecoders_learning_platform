const jwt = require("jsonwebtoken");

function extractBearerToken(req) {
  const hdr = req.headers.authorization || req.headers.Authorization || "";
  if (typeof hdr !== "string") return null;

  const parts = hdr.trim().split(/\s+/);
  let raw = parts.length === 1 ? parts[0] : parts[parts.length - 1];
  if (!raw || raw.toLowerCase() === "bearer") return null;
  raw = raw.replace(/^"(.+)"$/, "$1"); // strip surrounding quotes
  return raw;
}

function normalizeUser(decoded) {
  const role =
    typeof decoded.role === "string" ? decoded.role.toLowerCase() : null;
  const _id = decoded._id || decoded.id || decoded.userId;
  const id = decoded.id || decoded._id || decoded.userId;
  return { ...decoded, _id, id, role };
}

exports.verifyToken = (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      clockTolerance: 30,
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
    const token = extractBearerToken(req);
    if (!token) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = normalizeUser(decoded);
    req.user = user._id ? user : null;
    next();
  } catch {
    req.user = null;
    next();
  }
};
