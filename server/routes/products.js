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
} from "../controllers/productController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Public
router.get("/", getProducts);
router.get("/:id/image", getProductImage);   // serves legacy base64 images
router.get("/:id/related", getRelatedProducts);
router.get("/:id", getProductById);

// Admin (login removed — direct access)
router.post("/", upload.single("image"), createProduct);
router.put("/:id", upload.single("image"), updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/toggle", toggleProductActive);

export default router;
