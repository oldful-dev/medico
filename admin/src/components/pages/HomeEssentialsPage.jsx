"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
} from "lucide-react";
import { serviceAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import ServiceCategoryTab from "@/components/common/ServiceCategoryTab";
import DynamicServiceFormModal from "@/components/common/DynamicServiceFormModal";

export default function HomeEssentialsPage() {
  const [activeTab, setActiveTab] = useState("services");
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const isEmoji = (str) => {
    if (!str) return false;
    const clean = str.trim();
    return clean.length <= 4 && !clean.includes('.') && !clean.includes('/') && !clean.includes(':');
  };

  const getImageUrl = (imageName) => {
    if (!imageName) return "";
    if (imageName.startsWith("http://") || imageName.startsWith("https://")) {
      return imageName;
    }
    return `https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/${imageName}`;
  };

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await serviceAPI.getAll();
      const allServices = res.data?.data || [];
      const homeSvc = allServices
        // Trips & Travels is still serviceType HOME_ESSENTIALS (that field
        // is left alone — mobile filters key off it), but its `category`
        // was re-tagged to TOURS_TRAVEL as part of the admin restructure
        // so it now lives under the Tours & Travel admin page instead.
        .filter(s => s.serviceType === "HOME_ESSENTIALS" && s.slug !== "home-essentials" && s.category !== "TOURS_TRAVEL")
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
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditingService(s);
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

  const handleDelete = async (s, isForce = false) => {
    if (!isForce && !confirm(`Are you sure you want to delete "${s.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await serviceAPI.delete(s.id, { force: isForce });
      if (res.data?.success === false) {
        if (confirm(`${res.data.message}`)) {
          handleDelete(s, true);
        }
      } else {
        showToast("Service deleted successfully", "success");
      }
      loadServices();
    } catch (e) {
      console.error(e);
      const errMsg = e.response?.data?.message || "Failed to delete service. Active bookings might exist.";
      showToast(errMsg, "error");
      loadServices();
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

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
        <button
          className={`btn btn-sm ${activeTab === "services" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("services")}
        >
          Services
        </button>
        <button
          className={`btn btn-sm ${activeTab === "categories" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("categories")}
        >
          Categories
        </button>
      </div>

      {activeTab === "categories" ? (
        <ServiceCategoryTab module="HOME_ESSENTIALS" />
      ) : (
      <>
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
                        {isEmoji(s.icon) ? (
                          <span style={{ fontSize: 20 }}>{s.icon || "🛠️"}</span>
                        ) : (
                          <img
                            src={getImageUrl(s.icon)}
                            alt={s.name}
                            style={{ width: 24, height: 24, objectFit: "contain" }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://placehold.co/40x40?text=Service";
                            }}
                          />
                        )}
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
                        <div style={{ fontWeight: 600 }}>
                          {s.checkoutGroup === "D" && (!s.basePrice || s.basePrice === 0)
                            ? <span className="badge badge-warning" style={{ fontWeight: 600 }}>Request-based</span>
                            : `₹${s.basePrice ?? 0}`}
                        </div>
                        <div className="text-sm text-muted">
                          {s.formFieldsJson?.sections?.[0]?.fields?.some(f => (f.options || []).some(o => typeof o.price === 'number'))
                            ? "Variable — see pricing options"
                            : (s.pricingText || "No text")}
                        </div>
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

      <DynamicServiceFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={loadServices}
        editingService={editingService}
        category="HOME_ESSENTIALS"
        defaultSortOrder={services.length + 1}
      />
      </>
      )}
    </div>
  );
}
