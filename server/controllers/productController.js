import Product from "../models/Product.js";

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

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    // Strip any base64 images from the list response to keep payload small
    res.json(products.map(sanitiseForList));
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
    const product = await Product.findById(req.params.id).select("image").lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!product.image) return res.status(404).json({ message: "No image" });

    if (isBase64(product.image)) {
      // Decode and stream the base64 image
      const [meta, data] = product.image.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
      const buffer = Buffer.from(data, "base64");
      res.set("Content-Type", mimeType);
      res.set("Cache-Control", "public, max-age=86400"); // cache 1 day
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

// Admin: create product (with optional image upload)
export const createProduct = async (req, res) => {
  try {
    const data = { ...req.body };
    // New uploads go to disk — req.file.filename is the saved filename
    if (req.file) {
      data.image = req.file.filename; // just the filename, e.g. "1724000000000-ladoo.jpg"
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
      data.image = req.file.filename;
    }
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
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Could not delete product", error: err.message });
  }
};

export const toggleProductActive = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    product.isActive = !product.isActive;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Could not update product status", error: err.message });
  }
};
