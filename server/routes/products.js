import express from "express";
import {
  getProducts,
  getProductById,
  getProductImage,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  toggleProductStock,
} from "../controllers/productController.js";
import upload from "../middleware/upload.js";
import { protectAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public
router.get("/", getProducts);
router.get("/:id/image", getProductImage);   // serves legacy base64 images
router.get("/:id/related", getRelatedProducts);
router.get("/:id", getProductById);

// Admin (protected with JWT)
router.post("/", protectAdmin, upload.single("image"), createProduct);
router.put("/:id", protectAdmin, upload.single("image"), updateProduct);
router.delete("/:id", protectAdmin, deleteProduct);
router.patch("/:id/toggle", protectAdmin, toggleProductActive);
router.patch("/:id/stock", protectAdmin, toggleProductStock);

export default router;
