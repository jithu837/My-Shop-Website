import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      required: true,
      enum: ["Sweets", "Hots", "Snacks", "Combo", "Other"],
      default: "Sweets",
    },
    image: { type: String, default: "" }, // stored filename under /uploads

    // Price is always stored per 1 kilogram (1000g). All gram prices are
    // derived from this on the fly: pricePerKg * (grams / 1000)
    pricePerKg: { type: Number, required: true, min: 0 },

    // Stock is tracked in grams so partial-kg sales reduce it accurately
    stockGrams: { type: Number, required: true, default: 0, min: 0 },
    lowStockThresholdGrams: { type: Number, default: 500 },

    minOrderGrams: { type: Number, default: 50 },
    stepGrams: { type: Number, default: 50 },
    maxOrderGrams: { type: Number, default: 1000 },

    offerPercent: { type: Number, default: 0, min: 0, max: 90 },
    isActive: { type: Boolean, default: true },

    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    soldGrams: { type: Number, default: 0 }, // for best/least seller analytics
  },
  { timestamps: true }
);

// Database indexes for fast querying & sorting
productSchema.index({ isActive: 1, category: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ soldGrams: -1 });

productSchema.virtual("inStock").get(function () {
  return this.stockGrams > 0 && this.isActive;
});

productSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Product", productSchema);
