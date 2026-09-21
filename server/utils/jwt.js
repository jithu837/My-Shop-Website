import jwt from "jsonwebtoken";

const getSecret = () =>
  process.env.JWT_SECRET || "chamundeshwari_admin_super_secret_jwt_key_2026";

export const generateToken = (payload) => {
  return jwt.sign(payload, getSecret(), {
    expiresIn: "7d",
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, getSecret());
};
