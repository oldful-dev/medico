"use client";
import { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Search, 
  Sliders,
  DollarSign
} from "lucide-react";
import { serviceAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

export default function HomeEssentialsPage() {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Form states
  const [form, setForm] = useState({
    name: "",
    slug: "",
    icon: "🛠️",
    route: "",
    headline: "",
    subhead: "",
    checkoutGroup: "D",
    basePrice: 0,
    pricingText: "Submit Request",
    sortOrder: 1,
    isEnabled: true,
    serviceType: "HOME_ESSENTIALS"
  });

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await serviceAPI.getAll();
      const allServices = res.data?.data || [];
      const homeSvc = allServices
        .filter(s => s.serviceType === "HOME_ESSENTIALS" && s.slug !== "home-essentials")
        .sort((a, b) => a.sortOrder - b.sortOrder);
      setServices(homeSvc);
      setFilteredServices(homeSvc);
    } catch (e) {
      console.error(e);
      showToast("Failed to load services", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Handle Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredServices(services);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = services.filter(
      s =>
        s.name?.toLowerCase().includes(q) ||
        s.slug?.toLowerCase().includes(q) ||
        s.headline?.toLowerCase().includes(q) ||
        s.subhead?.toLowerCase().includes(q)
    );
    setFilteredServices(filtered);
  }, [searchQuery, services]);

  const openAdd = () => {
    setEditingService(null);
    setForm({
      name: "",
      slug: "",
      icon: "🛠️",
      route: "",
      headline: "",
      subhead: "",
      checkoutGroup: "D",
      basePrice: 0,
      pricingText: "Submit Request",
      sortOrder: services.length + 1,
      isEnabled: true,
      serviceType: "HOME_ESSENTIALS"
    });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditingService(s);
    setForm({
      name: s.name || "",
      slug: s.slug || "",
      icon: s.icon || "🛠️",
      route: s.route || "",
      headline: s.headline || "",
      subhead: s.subhead || "",
      checkoutGroup: s.checkoutGroup || "D",
      basePrice: s.basePrice !== null && s.basePrice !== undefined ? s.basePrice : 0,
      pricingText: s.pricingText || "",
      sortOrder: s.sortOrder || 1,
      isEnabled: s.isEnabled ?? true,
      serviceType: "HOME_ESSENTIALS"
    });
    setShowModal(true);
  };

  const handleToggle = async (s) => {
    try {
      await serviceAPI.update(s.id, { isEnabled: !s.isEnabled });
      showToast(`Service ${s.isEnabled ? "disabled" : "enabled"} successfully`, "success");
      loadServices();
    } catch (e) {
      console.error(e);
      showToast("Failed to toggle service status", "error");
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Are you sure you want to delete "${s.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await serviceAPI.delete(s.id);
      showToast("Service deleted successfully", "success");
      loadServices();
    } catch (e) {
      console.error(e);
      showToast("Failed to delete service. Active bookings might exist.", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        basePrice: parseFloat(form.basePrice) || 0,
        sortOrder: parseInt(form.sortOrder, 10) || 1
      };

      if (editingService) {
        await serviceAPI.update(editingService.id, payload);
        showToast("Service updated successfully", "success");
      } else {
        await serviceAPI.create(payload);
        showToast("Service created successfully", "success");
      }
      setShowModal(false);
      loadServices();
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.message || "Operation failed", "error");
    }
  };

  // Helper stats
  const totalCount = services.length;
  const activeCount = services.filter(s => s.isEnabled).length;
  const groupStats = services.reduce((acc, curr) => {
    const g = curr.checkoutGroup || "D";
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, { A: 0, B: 0, C: 0, D: 0 });

  if (loading && services.length === 0) {
    return <div className="page-header"><h2>Loading Home Essentials...</h2></div>;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2>Home Essentials Management</h2>
        <p>Configure details, copy matrix, pricing models, and checkout groups for mobile application services</p>
      </div>

      {/* Stats Counter Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", marginBottom: 24 }}>
        <div className="card">
          <div className="card-body">
            <div className="text-sm text-muted">Total Services</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{totalCount}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-sm text-muted">Active / Live</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-primary-light)", marginTop: 4 }}>{activeCount}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-sm text-muted">Standard Checkout</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <span className="badge badge-success">Group A: {groupStats.A}</span>
              <span className="badge badge-default">Group B: {groupStats.B}</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-sm text-muted">Inquiry Flows</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <span className="badge badge-warning">Group C: {groupStats.C}</span>
              <span className="badge badge-default">Group D: {groupStats.D}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 280, display: "flex", alignItems: "center" }}>
          <Search size={18} className="text-muted" style={{ position: "absolute", left: 12 }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 38, margin: 0, height: 40 }}
            placeholder="Search by name, slug, headline or subhead..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add New Service
        </button>
      </div>

      {/* Services Table Card */}
      <div className="card">
        <div className="card-header">
          <h3>Services Matrix ({filteredServices.length})</h3>
        </div>
        <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Sort</th>
                <th style={{ width: 180 }}>Service</th>
                <th>Copy Matrix (App Screen View)</th>
                <th style={{ width: 120 }}>Group</th>
                <th style={{ width: 150 }}>Pricing</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 160, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted" style={{ textAlign: "center", padding: 32 }}>
                    No services match your search queries.
                  </td>
                </tr>
              ) : (
                filteredServices.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: "var(--text-secondary)" }}>#{s.sortOrder}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{s.icon || "🛠️"}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div className="text-sm text-muted">/{s.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.headline || s.name}</div>
                        <div className="text-sm text-muted" style={{ maxHeight: 36, overflow: "hidden" }}>{s.subhead || s.tagline || "No description"}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        s.checkoutGroup === "A" ? "badge-success" :
                        s.checkoutGroup === "B" ? "badge-default" :
                        s.checkoutGroup === "C" ? "badge-warning" : "badge-default"
                      }`}>
                        Group {s.checkoutGroup || "D"}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>₹{s.basePrice ?? 0}</div>
                        <div className="text-sm text-muted">{s.pricingText || "No text"}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.isEnabled ? "badge-success" : "badge-default"}`}>
                        {s.isEnabled ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(s)}>
                          <Edit2 size={14} /> Edit
                        </button>
                        <button 
                          className={`btn btn-sm ${s.isEnabled ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => handleToggle(s)}
                        >
                          {s.isEnabled ? <><ToggleRight size={14} /> Disable</> : <><ToggleLeft size={14} /> Enable</>}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal Overlay */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingService ? "Edit Service" : "Add Service"}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-sm btn-secondary">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {/* Section: Identifiers */}
                <div style={{ fontWeight: 700, color: "var(--accent-primary-light)", borderBottom: "1px dashed var(--border-color)", paddingBottom: 6, marginBottom: 12 }}>
                  Service Details
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Service Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. AC & Appliance Repair"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Icon / Emoji</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ textAlign: "center" }}
                      maxLength={4}
                      placeholder="🛠️"
                      value={form.icon}
                      onChange={e => setForm({ ...form, icon: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unique Slug *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. appliance-repair"
                      value={form.slug}
                      onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Route *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. /appliance-repair"
                      value={form.route}
                      onChange={e => setForm({ ...form, route: e.target.value })}
                    />
                  </div>
                </div>

                {/* Section: Copy Matrix */}
                <div style={{ fontWeight: 700, color: "var(--accent-primary-light)", borderBottom: "1px dashed var(--border-color)", paddingBottom: 6, marginBottom: 12, marginTop: 16 }}>
                  Copy Matrix (App Screen View)
                </div>
                <div className="form-group">
                  <label className="form-label">App Headline *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="Headline displayed on service cards"
                    value={form.headline}
                    onChange={e => setForm({ ...form, headline: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">App Subhead *</label>
                  <textarea
                    className="form-input"
                    required
                    rows={2}
                    placeholder="Short descriptive card text under the headline"
                    value={form.subhead}
                    onChange={e => setForm({ ...form, subhead: e.target.value })}
                  />
                </div>

                {/* Section: Checkout Rules & Pricing */}
                <div style={{ fontWeight: 700, color: "var(--accent-primary-light)", borderBottom: "1px dashed var(--border-color)", paddingBottom: 6, marginBottom: 12, marginTop: 16 }}>
                  Checkout & Pricing Matrix
                </div>
                <div className="form-group">
                  <label className="form-label">Checkout Group *</label>
                  <select
                    className="form-input"
                    required
                    value={form.checkoutGroup}
                    onChange={e => setForm({ ...form, checkoutGroup: e.target.value })}
                  >
                    <option value="A">Group A: Standard Booking (₹299 + Date + Address + Photo)</option>
                    <option value="B">Group B: Utility/Bill (₹299 + Photo upload; No Address)</option>
                    <option value="C">Group C: Tech Support (Online video Call vs Home Visit selection)</option>
                    <option value="D">Group D: Zero Payment (Requests/Inquiry bypass; Direct Submit)</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Base Price (INR) *</label>
                    <input
                      type="number"
                      min={0}
                      className="form-input"
                      required
                      placeholder="e.g. 299"
                      value={form.basePrice}
                      onChange={e => setForm({ ...form, basePrice: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Display Pricing Text *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. ₹299 Service Charge + Bill"
                      value={form.pricingText}
                      onChange={e => setForm({ ...form, pricingText: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ alignItems: "center" }}>
                  <div className="form-group">
                    <label className="form-label">Sort Order (App Grid Position)</label>
                    <input
                      type="number"
                      min={1}
                      className="form-input"
                      required
                      value={form.sortOrder}
                      onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                  <div className="form-group" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 20 }}>
                    <input
                      type="checkbox"
                      id="isEnabledCheckbox"
                      checked={form.isEnabled}
                      onChange={e => setForm({ ...form, isEnabled: e.target.checked })}
                    />
                    <label htmlFor="isEnabledCheckbox" style={{ fontWeight: 600, cursor: "pointer", margin: 0 }}>Is Active (Live on App)</label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingService ? "Save Changes" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
