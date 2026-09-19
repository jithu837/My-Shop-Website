import Product from "../models/Product.js";
import sharp from "sharp";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

// In-memory cache for fast image serving
const imageMemoryCache = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────
// Previously images were stored as base64 strings directly in MongoDB, which
// made GET /api/products return 50 MB+ of data and time out.
// Now images are saved to disk and only the filename is stored in MongoDB.
// For OLD products that still have base64 in the image field we expose a
// dedicated /api/products/:id/image endpoint so the client can still display
// them while the admin migrates by re-uploading each product image.
const isBase64 = (str) => typeof str === "string" && str.startsWith("data:");

// Strip base64 from list responses — return empty string so the client shows
// its placeholder SVG. The full image is available via /:id/image.
const sanitiseForList = (product) => {
  if (isBase64(product.image)) {
    return { ...product, image: "", hasLegacyImage: true };
  }
  return product;
};

// Public: list products visible to customers (active only, unless admin=true)
export const getProducts = async (req, res) => {
  try {
    const { category, search, admin } = req.query;
    const filter = {};
    if (!admin) filter.isActive = true;
    if (category && category !== "All") filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };

    const productQuery = Product.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          name: 1,
          description: 1,
          category: 1,
          image: {
            $cond: [
              { $regexMatch: { input: { $ifNull: ["$image", ""] }, regex: /^data:/ } },
              "",
              { $ifNull: ["$image", ""] },
            ],
          },
          hasLegacyImage: {
            $regexMatch: { input: { $ifNull: ["$image", ""] }, regex: /^data:/ },
          },
          pricePerKg: 1,
          stockGrams: 1,
          lowStockThresholdGrams: 1,
          minOrderGrams: 1,
          stepGrams: 1,
          maxOrderGrams: 1,
          offerPercent: 1,
          isActive: 1,
          ratingAvg: 1,
          ratingCount: 1,
          soldGrams: 1,
          createdAt: 1,
          updatedAt: 1,
          inStock: { $and: ["$isActive", { $gt: ["$stockGrams", 0] }] },
        },
      },
    ]).option({ maxTimeMS: 8000 });
    const products = await Promise.race([
      productQuery,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Product query timed out")), 8000)
      ),
    ]);
    // Cache the product list: 60s in browser, 120s on CDN, serve stale up to 5 min
    res.set("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Could not load products", error: err.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product); // full product including base64 image if present
  } catch (err) {
    res.status(500).json({ message: "Could not load product", error: err.message });
  }
};

// Dedicated image endpoint — serves base64 as a proper image response.
// Used by the client for legacy products whose image is still stored in MongoDB.
export const getProductImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Fast in-memory cache check
    const cached = imageMemoryCache.get(id);
    if (cached) {
      if (req.headers["if-none-match"] === cached.etag) {
        return res.status(304).end();
      }
      res.set("Content-Type", cached.mimeType);
      res.set("Cache-Control", "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400");
      res.set("ETag", cached.etag);
      return res.send(cached.buffer);
    }

    const product = await Product.findById(id).select("image").lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!product.image) return res.status(404).json({ message: "No image" });

    if (isBase64(product.image)) {
      const [meta, data] = product.image.split(",");
      let mimeType = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
      let buffer = Buffer.from(data, "base64");

      // Compress on-the-fly if still over 150KB
      if (buffer.length > 150 * 1024) {
        try {
          buffer = await sharp(buffer)
            .resize({ width: 600, height: 600, fit: "cover", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          mimeType = "image/webp";
        } catch (err) {
          console.error("Compression error:", err);
        }
      }

      const etag = `"${crypto.createHash("md5").update(buffer).digest("hex")}"`;
      imageMemoryCache.set(id, { buffer, mimeType, etag });

      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }

      res.set("Content-Type", mimeType);
      res.set("Cache-Control", "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400");
      res.set("ETag", etag);
      return res.send(buffer);
    }

    // It's a filename — redirect to static /uploads/ route
    res.redirect(`/uploads/${product.image}`);
  } catch (err) {
    res.status(500).json({ message: "Could not load image", error: err.message });
  }
};

// Related products = same category, excluding itself
export const getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true,
    }).limit(4).lean();

    res.json(related.map(sanitiseForList));
  } catch (err) {
    res.status(500).json({ message: "Could not load related products", error: err.message });
  }
};

// Helper: compress uploaded image file to lightweight WebP
const processUploadedImage = async (file) => {
  if (!file) return null;
  try {
    const parsed = path.parse(file.path);
    const optimizedFilename = `${Date.now()}-${parsed.name}.webp`;
    const optimizedPath = path.join(parsed.dir, optimizedFilename);
    await sharp(file.path)
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(optimizedPath);

    // Delete original uncompressed file if different
    if (file.path !== optimizedPath && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return optimizedFilename;
  } catch (err) {
    console.error("Upload optimization failed:", err);
    return file.filename;
  }
};

// Admin: create product (with optional image upload)
export const createProduct = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.image = await processUploadedImage(req.file);
    }
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: "Could not create product", error: err.message });
  }
};

// Admin: update product
export const updateProduct = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.image = await processUploadedImage(req.file);
    }
    imageMemoryCache.delete(req.params.id);
    const product = await Product.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: "Could not update product", error: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    imageMemoryCache.delete(req.params.id);
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Could not delete product", error: err.message });
  }
};

export const toggleProductActive = async (req, res) => {
  try {
    imageMemoryCache.delete(req.params.id);
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    product.isActive = !product.isActive;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Could not update product status", error: err.message });
  }
};
