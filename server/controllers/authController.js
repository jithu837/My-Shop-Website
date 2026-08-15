import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const genToken = (admin) =>
  jwt.sign({ id: admin._id, email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// Runs once at server startup so the owner never has to manually create an
// admin account in the database - it's created from the .env credentials.
export const ensureAdminExists = async () => {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await Admin.findOne({ email });
  if (existing) return;

  const hashed = await bcrypt.hash(password, 10);
  await Admin.create({ name: "Owner", email, password: hashed });
  console.log(`Admin account ready -> ${email}`);
};

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: "Invalid email or password" });

    res.json({
      token: genToken(admin),
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const match = await bcrypt.compare(currentPassword, admin.password);
    if (!match) return res.status(401).json({ message: "Current password is incorrect" });

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Could not update password", error: err.message });
  }
};
