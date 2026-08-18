import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";

// Runs once at server startup so the owner never has to manually create an
// admin account in the database — it's created from the .env credentials.
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
