import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "aurum_gold_super_secret_key_2026";
const JWT_EXPIRES_IN = "24h";

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function extractTokenFromHeader(headers) {
  const authHeader = headers.get("authorization") || headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
}
