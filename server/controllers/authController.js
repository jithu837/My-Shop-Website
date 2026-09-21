import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import { generateToken } from "../utils/jwt.js";

const DEFAULT_ADMIN_PHONE = process.env.ADMIN_PHONE || "7816096147";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Jithu891#";

const cleanPhone = (phone = "") => {
  let cleaned = String(phone).replace(/[^\d]/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
};

// Auto-seed or sync default owner admin in DB
export const ensureDefaultAdmin = async () => {
  try {
    const phone = cleanPhone(DEFAULT_ADMIN_PHONE);
    let admin = await Admin.findOne({ phone }).maxTimeMS(5000);

    if (!admin) {
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
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
    const configuredPhone = cleanPhone(DEFAULT_ADMIN_PHONE);

    // 1. Check direct configured owner credentials (works even if DB is cold or offline)
    const isConfiguredOwner =
      inputPhone === configuredPhone && password === DEFAULT_ADMIN_PASSWORD;

    let admin = null;
    let isMatch = false;

    // 2. If not matched with direct env/default, or to fetch DB profile, query Mongo
    try {
      admin = await Admin.findOne({ phone: inputPhone }).maxTimeMS(4000);
      if (admin && admin.password) {
        isMatch = await bcrypt.compare(password, admin.password);
      }
    } catch (dbErr) {
      console.warn("[auth] Mongo query skipped during login check:", dbErr.message);
    }

    if (isConfiguredOwner) {
      isMatch = true;
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
