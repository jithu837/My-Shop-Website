import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import { generateToken } from "../utils/jwt.js";

const DEFAULT_ADMIN_PHONE = process.env.ADMIN_PHONE || "7816096147";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Jithu891#";

const cleanPhone = (phone = "") => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

// Auto-seed or sync default owner admin in DB
export const ensureDefaultAdmin = async () => {
  try {
    const phone = "7816096147";
    let admin = await Admin.findOne({ phone }).maxTimeMS(5000);

    if (!admin) {
      const hashedPassword = await bcrypt.hash("Jithu891#", 10);
      admin = await Admin.create({
        phone,
        password: hashedPassword,
        name: "Store Owner",
        role: "admin",
      });
      console.log(`[auth] Default owner account initialized for ${phone}`);
    }
  } catch (err) {
    console.warn("[auth] Note on default admin sync (non-fatal):", err.message);
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone number and password are required" });
    }

    const inputPhone = cleanPhone(phone);
    const configuredPhone = cleanPhone(process.env.ADMIN_PHONE || "7816096147");

    const inputPassword = String(password || "").trim();
    const configuredPassword = String(process.env.ADMIN_PASSWORD || "Jithu891#").trim();

    // Direct check: match phone (last 10 digits: 7816096147) and password (Jithu891# or configured)
    const isPhoneMatch =
      inputPhone === "7816096147" || inputPhone === configuredPhone;

    const isPasswordMatch =
      inputPassword === "Jithu891#" ||
      inputPassword.toLowerCase() === "jithu891#" ||
      inputPassword === configuredPassword ||
      inputPassword.toLowerCase() === configuredPassword.toLowerCase();

    const isConfiguredOwner = isPhoneMatch && isPasswordMatch;

    let admin = null;
    let isMatch = false;

    // Also check DB in case custom password was saved
    try {
      admin = await Admin.findOne({ phone: inputPhone }).maxTimeMS(4000);
      if (admin && admin.password) {
        isMatch = await bcrypt.compare(inputPassword, admin.password);
      }
    } catch (dbErr) {
      console.warn("[auth] Mongo query skipped during login check:", dbErr.message);
    }

    if (isConfiguredOwner) {
      isMatch = true;
      // sync password to DB in background so DB hash matches
      bcrypt.hash("Jithu891#", 10).then((hashed) => {
        Admin.findOneAndUpdate(
          { phone: "7816096147" },
          { password: hashed, name: "Store Owner", role: "admin" },
          { upsert: true }
        ).catch(() => {});
      });
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid phone number or password" });
    }

    const adminId = admin?._id ? String(admin._id) : "owner-admin";
    const adminPhone = admin?.phone || inputPhone;
    const adminName = admin?.name || "Store Owner";

    const token = generateToken({
      id: adminId,
      phone: adminPhone,
      name: adminName,
      role: "admin",
    });

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: adminId,
        phone: adminPhone,
        name: adminName,
        role: "admin",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed, please try again" });
  }
};

export const getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to retrieve session user" });
  }
};
