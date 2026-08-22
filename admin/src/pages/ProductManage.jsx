import React, { useEffect, useState } from "react";
import api, { imageUrl } from "../services/api.js";
import "../css/admin.css";

const emptyForm = {
  name: "", description: "", category: "Sweets", pricePerKg: "", stockGrams: "",
  lowStockThresholdGrams: 500, minOrderGrams: 50, stepGrams: 50, maxOrderGrams: 1000,
  offerPercent: 0,
};

const ProductManage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

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

  return (
    <div>
      <div className="admin-toolbar">
        <h1 style={{ marginBottom: 0 }}>Products ({products.length})</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th></th><th>Name</th><th>Category</th><th>Price/kg</th><th>Stock</th><th>Offer</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td><img src={imageUrl(p.image)} alt="" /></td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>₹{p.pricePerKg}</td>
                  <td className={p.stockGrams <= p.lowStockThresholdGrams ? "low-stock-cell" : ""}>
                    {p.stockGrams}g {p.stockGrams <= 0 && "· Out of stock"}
                  </td>
                  <td>{p.offerPercent > 0 ? `${p.offerPercent}%` : "—"}</td>
                  <td>
                    <button className={`badge ${p.isActive ? "badge-leaf" : "badge-danger"}`} style={{ border: "none" }} onClick={() => toggleActive(p._id)}>
                      {p.isActive ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-outline btn-small" onClick={() => openEdit(p)}>Edit</button>{" "}
                    <button className="btn btn-danger btn-small" onClick={() => remove(p._id)}>Delete</button>
                  </td>
                </tr>
              ))}
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
