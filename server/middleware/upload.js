import multer from "multer";
import path from "path";
import fs from "fs";

// ── Resolve uploads directory (same logic as server.js) ──────────────────────
const uploadDir = [
  path.resolve(process.cwd(), "uploads"),
  path.resolve(process.cwd(), "server/uploads"),
  path.resolve(process.cwd(), "../uploads"),
].find((d) => fs.existsSync(d)) || path.resolve(process.cwd(), "uploads");

// Ensure directory exists
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Disk storage — saves file to /uploads/<timestamp>-<originalname> ─────────
// This keeps images as actual files on disk and stores only the filename in
// MongoDB, keeping API responses tiny. (Previously base64 was embedded in DB,
// causing GET /api/products responses to be 50 MB+ → timeouts.)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG or WEBP images are allowed"));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export default upload;
