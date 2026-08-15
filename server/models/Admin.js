import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Owner" },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }, // hashed
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);
