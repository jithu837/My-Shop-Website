import React, { useEffect, useState } from "react";
import api, { imageUrl } from "../services/api.js";
import "../css/admin.css";

const emptyForm = {
  name: "", description: "", category: "Sweets", pricePerKg: "", stockGrams: 5000,
  lowStockThresholdGrams: 500, minOrderGrams: 50, stepGrams: 50, maxOrderGrams: 1000,
  offerPercent: 0, isAvailable: true,
};

const ProductManage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stockFilter, setStockFilter] = useState("all"); // 'all', 'in_stock', 'not_available'

  const load = () => {
    setLoading(true);
    api.get("/products", { params: { admin: true } }).then((res) => setProducts(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name, description: p.description, category: p.category, pricePerKg: p.pricePerKg,
      stockGrams: p.stockGrams, lowStockThresholdGrams: p.lowStockThresholdGrams,
      minOrderGrams: p.minOrderGrams, stepGrams: p.stepGrams, maxOrderGrams: p.maxOrderGrams,
      offerPercent: p.offerPercent,
      isAvailable: p.isAvailable !== false && p.stockGrams > 0,
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      if (imageFile) data.append("image", imageFile);

      if (editingId) {
        await api.put(`/products/${editingId}`, data);
      } else {
        await api.post("/products", data);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not save product");
    } finally {
      setSaving(false);
    }
  };

  // Instant Stock / Availability Handler (In Stock <-> Not Available)
  const toggleStock = async (id, currentlyInStock) => {
    const nextAvailability = !currentlyInStock;
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) =>
        p._id === id
          ? {
              ...p,
              isAvailable: nextAvailability,
              stockGrams: nextAvailability && p.stockGrams <= 0 ? 5000 : p.stockGrams,
              inStock: nextAvailability,
            }
          : p
      )
    );
    try {
      await api.patch(`/products/${id}/stock`, { isAvailable: nextAvailability });
    } catch (err) {
      alert(err.response?.data?.message || "Could not update product stock status");
      load();
    }
  };

  const toggleActive = async (id) => {
    try {
      await api.patch(`/products/${id}/toggle`);
    } catch (err) {
      alert(err.response?.data?.message || "Could not toggle product status");
    } finally {
      load();
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this product permanently?")) return;
    try {
      await api.delete(`/products/${id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete product");
    } finally {
      load();
    }
  };

  const filteredProducts = products.filter((p) => {
    const inStock = p.isAvailable !== false && p.stockGrams > 0;
    if (stockFilter === "in_stock") return inStock;
    if (stockFilter === "not_available") return !inStock;
    return true;
  });

  return (
    <div>
      <div className="admin-toolbar">
        <div>
          <h1 style={{ marginBottom: 4 }}>Products ({products.length})</h1>
          <p style={{ margin: 0, color: "var(--color-cream)", opacity: 0.8, fontSize: "0.95rem" }}>
            Manage stock availability. Toggle items to <strong>In Stock</strong> or <strong>Not Available</strong>.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="status-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            style={{ minWidth: "160px" }}
          >
            <option value="all">All Availability ({products.length})</option>
            <option value="in_stock">🟢 In Stock Only</option>
            <option value="not_available">🔴 Not Available Only</option>
          </select>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : filteredProducts.length === 0 ? (
        <p className="empty-state">No products found for this filter.</p>
      ) : (
        <div className="admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price/kg</th>
                <th>Stock / Availability Handler</th>
                <th>Offer</th>
                <th>Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const inStock = p.isAvailable !== false && p.stockGrams > 0;
                return (
                  <tr key={p._id} style={{ opacity: inStock ? 1 : 0.85 }}>
                    <td><img src={imageUrl(p)} alt="" style={{ filter: inStock ? "none" : "grayscale(100%)" }} /></td>
                    <td>
                      <strong>{p.name}</strong>
                      {!inStock && (
                        <span style={{ display: "block", fontSize: "0.75rem", color: "#f87171", fontWeight: 700 }}>
                          (Client sees as Not Available &amp; unclickable)
                        </span>
                      )}
                    </td>
                    <td>{p.category}</td>
                    <td>₹{p.pricePerKg}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                        <button
                          type="button"
                          className={`badge ${inStock ? "badge-leaf" : "badge-danger"}`}
                          style={{
                            border: "none",
                            cursor: "pointer",
                            padding: "6px 12px",
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            borderRadius: "6px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                            transition: "all 0.15s ease",
                          }}
                          onClick={() => toggleStock(p._id, inStock)}
                          title={inStock ? "Currently In Stock. Click to mark Not Available" : "Currently Not Available. Click to mark In Stock"}
                        >
                          <span>{inStock ? "🟢" : "🔴"}</span>
                          {inStock ? "In Stock" : "Not Available"}
                        </button>
                        <small style={{ color: "rgba(251,243,231,0.7)", fontSize: "0.8rem" }}>
                          Qty: {p.stockGrams}g
                        </small>
                      </div>
                    </td>
                    <td>{p.offerPercent > 0 ? `${p.offerPercent}%` : "—"}</td>
                    <td>
                      <button className={`badge ${p.isActive ? "badge-leaf" : "badge-danger"}`} style={{ border: "none", cursor: "pointer" }} onClick={() => toggleActive(p._id)}>
                        {p.isActive ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td>
                      <button className="btn btn-outline btn-small" onClick={() => openEdit(p)}>Edit</button>{" "}
                      <button className="btn btn-danger btn-small" onClick={() => remove(p._id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Product" : "Add Product"}</h3>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Product name</label>
                <input required name="name" value={form.name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows="2" name="description" value={form.description} onChange={handleChange} />
              </div>

              <div className="admin-modal-grid">
                <div className="form-group">
                  <label>Stock Availability</label>
                  <select
                    name="isAvailable"
                    value={form.isAvailable ? "true" : "false"}
                    onChange={(e) => setForm({ ...form, isAvailable: e.target.value === "true" })}
                  >
                    <option value="true">🟢 In Stock (Available for ordering)</option>
                    <option value="false">🔴 Not Available (Out of stock / Dimmed on store)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" value={form.category} onChange={handleChange}>
                    <option>Sweets</option><option>Hots</option><option>Snacks</option><option>Combo</option><option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price per kg (₹)</label>
                  <input required type="number" min="0" name="pricePerKg" value={form.pricePerKg} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Stock (grams)</label>
                  <input required type="number" min="0" name="stockGrams" value={form.stockGrams} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Low stock alert below (g)</label>
                  <input type="number" min="0" name="lowStockThresholdGrams" value={form.lowStockThresholdGrams} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Min order (g)</label>
                  <input type="number" min="50" step="50" name="minOrderGrams" value={form.minOrderGrams} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Step size (g)</label>
                  <input type="number" min="50" step="50" name="stepGrams" value={form.stepGrams} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Max order (g)</label>
                  <input type="number" min="50" step="50" name="maxOrderGrams" value={form.maxOrderGrams} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Offer (%)</label>
                  <input type="number" min="0" max="90" name="offerPercent" value={form.offerPercent} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group">
                <label>Product image</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Product"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManage;
