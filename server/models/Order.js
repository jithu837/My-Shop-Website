import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: String,
    grams: { type: Number, required: true },
    pricePerKg: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },

    // "Delivery" = normal website order needing an address.
    // "Counter" = customer scanned the shop's QR code, ordered in-store, no delivery needed.
    orderType: { type: String, enum: ["Delivery", "Counter"], default: "Delivery" },

    customerName: { type: String, default: "Walk-in Customer" },
    customerPhone: { type: String, default: "" },
    customerAddress: { type: String, default: "" },
    customerEmail: { type: String, default: "" },

    items: [orderItemSchema],

    subtotal: { type: Number, required: true },
    couponCode: { type: String, default: "" },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },

    paymentMethod: { type: String, enum: ["COD", "UPI", "Cash"], required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },

    status: {
      type: String,
      enum: ["New", "Accepted", "Packed", "Dispatched", "Delivered", "Cancelled"],
      default: "New",
    },
  },
  { timestamps: true }
);

// Database indexes for fast querying & tracking
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ customerPhone: 1 });

export default mongoose.model("Order", orderSchema);
