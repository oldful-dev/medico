"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Play, 
  RotateCcw, 
  Save, 
  Sparkles, 
  FileCode, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  List,
  Layers,
  ShieldAlert,
  Info,
  Sliders,
  Upload,
  Loader2
} from "lucide-react";
import { appConfigAPI, mediaAPI, bannerAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import RouteSelector from "@/components/common/RouteSelector";

export default function ServerUIPage() {
  const [rawJson, setRawJson] = useState("");
  const [parsedConfig, setParsedConfig] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [carouselBanners, setCarouselBanners] = useState([]);
  const [activeTab, setActiveTab] = useState("form-sections");
  const [editorMode, setEditorMode] = useState("form"); // "form" | "json"

  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState(null); // { type: "service", sIdx, svIdx } or { type: "banner", bIdx } or { type: "sos_icon" } or { type: "sos_illustration" }
  const iconFileInputRef = useRef(null);

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

  const triggerUpload = (target) => {
    setUploadingTarget(target);
    if (iconFileInputRef.current) {
      iconFileInputRef.current.value = "";
      iconFileInputRef.current.click();
    }
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Only image files are allowed", "error");
      return;
    }
    
    setUploadingIcon(true);
    try {
      const res = await mediaAPI.getSignedUrl({
        fileName: file.name,
        contentType: file.type,
        folder: "mobile/assets/images"
      });

      if (!res.data.success) throw new Error("Failed to get signed URL");
      const { signedUrl, storagePath, fileUrl, gcsUri } = res.data.data;

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'Content-Length': file.size.toString(),
        },
        body: file,
        credentials: 'omit',
      });

      if (!uploadRes.ok) {
        throw new Error("GCS Upload failed");
      }

      const confirmRes = await mediaAPI.confirm({
        storagePath,
        fileUrl,
        gcsUri,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        folder: "mobile/assets/images"
      });

      if (confirmRes.data.success) {
        const fileNameGCS = storagePath.split("/").pop();
        if (uploadingTarget.type === "service") {
          updateService(uploadingTarget.sIdx, uploadingTarget.svIdx, "icon", fileNameGCS);
          showToast("Icon uploaded and set successfully", "success");
        } else if (uploadingTarget.type === "banner") {
          updateBanner(uploadingTarget.bIdx, "image", fileNameGCS);
          showToast("Banner image uploaded and set successfully", "success");
        } else if (uploadingTarget.type === "section_image") {
          updateSection(uploadingTarget.sIdx, "image_url", fileNameGCS);
          showToast("Section background image uploaded and set successfully", "success");
        } else if (uploadingTarget.type === "sos_icon") {
          updateSosBanner("icon", fileNameGCS);
          showToast("SOS icon uploaded and set successfully", "success");
        } else if (uploadingTarget.type === "sos_illustration") {
          updateSosBanner("illustration", fileNameGCS);
          showToast("SOS illustration uploaded and set successfully", "success");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to upload image to GCS", "error");
    } finally {
      setUploadingIcon(false);
      setUploadingTarget(null);
    }
  };

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, bRes] = await Promise.all([
        appConfigAPI.getHomeConfig(),
        bannerAPI.getHome().catch(() => ({ data: { data: [] } }))
      ]);
      const configData = res.data?.data || {};
      setCarouselBanners(bRes.data?.data || []);
      setOriginalConfig(configData);
      const formatted = JSON.stringify(configData, null, 2);
      setRawJson(formatted);
      setParsedConfig(configData);
    } catch (e) {
      console.error(e);
      setError("Failed to load server UI configuration.");
      showToast("Error loading home layout config", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleJsonChange = (val) => {
    setRawJson(val);
    try {
      if (!val.trim()) {
        setParsedConfig(null);
        setError("Configuration cannot be empty");
        return;
      }
      const parsed = JSON.parse(val);
      setParsedConfig(parsed);
      setError(null);
    } catch (err) {
      setParsedConfig(null);
      setError(`JSON Parse Error: ${err.message}`);
    }
  };

  const handleFormat = () => {
    try {
      if (!rawJson.trim()) return;
      const parsed = JSON.parse(rawJson);
      setRawJson(JSON.stringify(parsed, null, 2));
      setParsedConfig(parsed);
      setError(null);
      showToast("JSON Formatted", "success");
    } catch (err) {
      showToast("Cannot format invalid JSON", "error");
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset the home configuration to database defaults? Any unsaved edits will be discarded.")) {
      return;
    }
    try {
      setSaving(true);
      await appConfigAPI.resetHomeConfig();
      showToast("Reset home configuration to defaults", "success");
      await loadConfig();
    } catch (e) {
      console.error(e);
      showToast("Failed to reset configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (error) {
      showToast("Please resolve JSON errors before saving", "error");
      return;
    }
    try {
      setSaving(true);
      const configToSave = editorMode === "json" ? JSON.parse(rawJson) : parsedConfig;
      await appConfigAPI.updateHomeConfig(configToSave);
      setOriginalConfig(configToSave);
      setRawJson(JSON.stringify(configToSave, null, 2));
      showToast("Home layout configuration published successfully", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to publish home layout configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  // ─── Form State Updater Functions ──────────────────────────────────────────

  const updateRootField = (field, val) => {
    setParsedConfig(prev => {
      const next = { ...prev, [field]: val };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const updateSosBanner = (field, val) => {
    setParsedConfig(prev => {
      const next = { ...prev, sos_banner: { ...prev.sos_banner, [field]: val } };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const updateGreetingBanner = (field, val) => {
    setParsedConfig(prev => {
      const next = { ...prev, greeting_banner: { ...prev.greeting_banner, [field]: val } };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const updateBanner = (index, field, val) => {
    setParsedConfig(prev => {
      const banners = [...(prev.banners || [])];
      banners[index] = { ...banners[index], [field]: val };
      const next = { ...prev, banners };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const addBanner = () => {
    setParsedConfig(prev => {
      const banners = [...(prev.banners || [])];
      banners.push({
        id: `banner_${Date.now()}`,
        image: "banner.png",
        title: "New Promotional Banner",
        subtitle: "Click to explore wellness options",
        cta_route: "/doctor-visit",
        enabled: true
      });
      const next = { ...prev, banners };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const removeBanner = (index) => {
    setParsedConfig(prev => {
      const banners = (prev.banners || []).filter((_, i) => i !== index);
      const next = { ...prev, banners };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const addSection = (type = "custom_card") => {
    setParsedConfig(prev => {
      const sections = [...(prev.sections || [])];
      const newId = `section_${Date.now()}`;
      if (type === "custom_card" || type === "banner_card") {
        sections.push({
          id: newId,
          title: "Plan Your Next Travel",
          subtitle: "Tell us where you want to go.",
          type: type,
          enabled: true,
          sort_order: sections.length + 1,
          image_url: "banner.png",
          cta_text: "Share Now",
          view_all_route: "/trip-travels",
          services: []
        });
      } else {
        sections.push({
          id: newId,
          title: "New Service Section",
          type: type,
          enabled: true,
          sort_order: sections.length + 1,
          max_items: 6,
          services: []
        });
      }
      const next = { ...prev, sections };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const removeSection = (index) => {
    setParsedConfig(prev => {
      const sections = (prev.sections || []).filter((_, i) => i !== index);
      const next = { ...prev, sections };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const updateSection = (sectionIndex, field, val) => {
    setParsedConfig(prev => {
      const sections = [...(prev.sections || [])];
      sections[sectionIndex] = { ...sections[sectionIndex], [field]: val };
      const next = { ...prev, sections };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const updateService = (sectionIndex, serviceIndex, field, val) => {
    setParsedConfig(prev => {
      const sections = [...(prev.sections || [])];
      const services = [...(sections[sectionIndex].services || [])];
      services[serviceIndex] = { ...services[serviceIndex], [field]: val };
      sections[sectionIndex] = { ...sections[sectionIndex], services };
      const next = { ...prev, sections };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const updateTrustBadge = (index, field, val) => {
    setParsedConfig(prev => {
      const trust_badges = [...(prev.trust_badges || [])];
      trust_badges[index] = { ...trust_badges[index], [field]: val };
      const next = { ...prev, trust_badges };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  return (
    <div>
      <input 
        type="file" 
        ref={iconFileInputRef} 
        onChange={handleIconUpload} 
        accept="image/*"
        style={{ display: "none" }}
      />
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Server-Driven Home Layout Config</h2>
          <p>Configure layout sections, custom card banners, trust badges and quick services displayed on the mobile app home screen.</p>
        </div>
        <a href="/banners" className="btn btn-outline-primary" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          <Sparkles size={16} /> Manage Top Carousel Banners
        </a>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <RefreshCw className="animate-spin text-muted" size={32} style={{ margin: "0 auto 12px" }} />
          <p className="text-muted">Loading layout configurations...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
          
          {/* Left Side: Configuration Editor (Form / JSON modes) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* Editor Selector Bar */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              backgroundColor: "var(--card-bg)", 
              padding: "10px 16px", 
              borderRadius: 8, 
              border: "1px solid var(--border-color)" 
            }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  className={`btn btn-sm ${editorMode === "form" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => { setEditorMode("form"); setError(null); }}
                >
                  <Sliders size={14} style={{ marginRight: 4 }} /> Form Editor
                </button>
                <button 
                  className={`btn btn-sm ${editorMode === "json" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => { setEditorMode("json"); handleJsonChange(rawJson); }}
                >
                  <FileCode size={14} style={{ marginRight: 4 }} /> JSON Code Source
                </button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-sm btn-danger" onClick={handleReset} disabled={saving}>
                  <RotateCcw size={14} /> Reset Default
                </button>
                <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving || (editorMode === "json" && !!error)}>
                  <Save size={14} /> {saving ? "Saving..." : "Publish Config"}
                </button>
              </div>
            </div>

            {/* Validation Notification Banner */}
            {error && editorMode === "json" && (
              <div style={{ 
                backgroundColor: "rgba(239, 68, 68, 0.1)", 
                borderLeft: "4px solid #EF4444", 
                padding: "10px 14px", 
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                color: "#EF4444"
              }}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Raw JSON Code Source Mode */}
            {editorMode === "json" && (
              <div className="card" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Raw Layout Config JSON</span>
                  <button className="btn btn-sm btn-secondary" onClick={handleFormat}>
                    Format JSON
                  </button>
                </div>
                <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-color)" }}>
                  <textarea
                    value={rawJson}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    style={{
                      width: "100%",
                      height: "550px",
                      fontFamily: "Courier, Monaco, monospace",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      padding: "16px",
                      backgroundColor: "#1E1E1E",
                      color: "#D4D4D4",
                      border: "none",
                      outline: "none",
                      resize: "none"
                    }}
                    placeholder="// Put layout JSON here..."
                  />
                </div>
              </div>
            )}

            {/* Form Editor Mode */}
            {editorMode === "form" && parsedConfig && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* Form Tabs */}
                <div style={{ 
                  display: "flex", 
                  gap: 4, 
                  borderBottom: "1px solid var(--border-color)", 
                  paddingBottom: 2 
                }}>
                  <button 
                    onClick={() => setActiveTab("form-sections")} 
                    style={{
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      backgroundColor: "transparent",
                      border: "none",
                      borderBottom: activeTab === "form-sections" ? "2px solid var(--primary-color)" : "none",
                      color: activeTab === "form-sections" ? "var(--primary-color)" : "var(--text-muted)",
                      cursor: "pointer"
                    }}
                  >
                    Sections & Services
                  </button>
                  <button 
                    onClick={() => setActiveTab("form-general")} 
                    style={{
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      backgroundColor: "transparent",
                      border: "none",
                      borderBottom: activeTab === "form-general" ? "2px solid var(--primary-color)" : "none",
                      color: activeTab === "form-general" ? "var(--primary-color)" : "var(--text-muted)",
                      cursor: "pointer"
                    }}
                  >
                    General & SOS
                  </button>
                  <button 
                    onClick={() => setActiveTab("form-badges")} 
                    style={{
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      backgroundColor: "transparent",
                      border: "none",
                      borderBottom: activeTab === "form-badges" ? "2px solid var(--primary-color)" : "none",
                      color: activeTab === "form-badges" ? "var(--primary-color)" : "var(--text-muted)",
                      cursor: "pointer"
                    }}
                  >
                    Trust Badges
                  </button>
                </div>

                {/* Tab Content: General & SOS */}
                {activeTab === "form-general" && (
                  <div className="card">
                    <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Configuration Version</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={parsedConfig.version || ""} 
                          onChange={(e) => updateRootField("version", e.target.value)} 
                          style={{ maxWidth: 200 }}
                        />
                        <small style={{ color: "var(--text-muted)", display: "block", marginTop: 4 }}>
                          Increments whenever you hit &quot;Publish Config&quot; below.
                        </small>
                      </div>

                      <hr style={{ borderColor: "var(--border-color)" }} />

                      {/* Green Greeting Banner Subtitle */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ margin: 0 }}>Green Greeting Banner Subtitle</h4>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={parsedConfig.greeting_banner?.enabled !== false} 
                            onChange={(e) => updateGreetingBanner("enabled", e.target.checked)}
                          />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>Enabled on App Home Screen</span>
                        </label>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Greeting Subtitle Message</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={parsedConfig.greeting_banner?.subtitle || "We see you. We hear you. We care."} 
                          onChange={(e) => updateGreetingBanner("subtitle", e.target.value)}
                          placeholder="We see you. We hear you. We care."
                        />
                        <small style={{ color: "var(--text-muted)", display: "block", marginTop: 4 }}>
                          Dynamic subtitle message displayed on the green greeting card below the user name.
                        </small>
                      </div>

                      <hr style={{ borderColor: "var(--border-color)" }} />
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ margin: 0 }}>SOS Emergency Banner</h4>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={!!parsedConfig.sos_banner?.enabled} 
                            onChange={(e) => updateSosBanner("enabled", e.target.checked)}
                          />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>Enabled on App Home Screen</span>
                        </label>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="form-group">
                          <label className="form-label">Title Line 1</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={parsedConfig.sos_banner?.title_line1 || ""} 
                            onChange={(e) => updateSosBanner("title_line1", e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Title Line 2</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={parsedConfig.sos_banner?.title_line2 || ""} 
                            onChange={(e) => updateSosBanner("title_line2", e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">CTA Button Text</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={parsedConfig.sos_banner?.cta_text || ""} 
                            onChange={(e) => updateSosBanner("cta_text", e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">CTA Router Path</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={parsedConfig.sos_banner?.cta_route || ""} 
                            onChange={(e) => updateSosBanner("cta_route", e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Icon Image Filename</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={parsedConfig.sos_banner?.icon || ""} 
                            onChange={(e) => updateSosBanner("icon", e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Illustration Image Filename</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={parsedConfig.sos_banner?.illustration || ""} 
                            onChange={(e) => updateSosBanner("illustration", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: Banners List */}
                {activeTab === "form-banners" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 style={{ margin: 0 }}>Home Screen Banners ({parsedConfig.banners?.length || 0})</h4>
                      <button className="btn btn-sm btn-primary" onClick={addBanner}>
                        <Plus size={14} style={{ marginRight: 4 }} /> Add Banner
                      </button>
                    </div>

                    {(parsedConfig.banners || []).map((banner, index) => (
                      <div key={banner.id} className="card" style={{ border: "1px solid var(--border-color)" }}>
                        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px" }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>Banner #{index + 1}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                              <input 
                                type="checkbox" 
                                checked={!!banner.enabled} 
                                onChange={(e) => updateBanner(index, "enabled", e.target.checked)}
                              />
                              Active
                            </label>
                            <button className="text-danger" style={{ background: "transparent", border: "none", cursor: "pointer" }} onClick={() => removeBanner(index)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="card-body" style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div className="form-group">
                            <label className="form-label">Title</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              value={banner.title || ""} 
                              onChange={(e) => updateBanner(index, "title", e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Subtitle</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              value={banner.subtitle || ""} 
                              onChange={(e) => updateBanner(index, "subtitle", e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Image Filename</label>
                            <div style={{ display: "flex", gap: 6 }}>
                              <input 
                                type="text" 
                                className="form-input" 
                                value={banner.image || ""} 
                                onChange={(e) => updateBanner(index, "image", e.target.value)}
                                style={{ flex: 1, margin: 0 }}
                              />
                              <button 
                                type="button" 
                                onClick={() => triggerUpload({ type: "banner", bIdx: index })}
                                disabled={uploadingIcon && uploadingTarget?.type === "banner" && uploadingTarget?.bIdx === index}
                                className="btn btn-secondary"
                                style={{ 
                                  padding: "0 12px", 
                                  height: 38,
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center",
                                  opacity: uploadingIcon && uploadingTarget?.type === "banner" && uploadingTarget?.bIdx === index ? 0.7 : 1 
                                }}
                                title="Upload image to GCS path ayuxa-assets/mobile/assets/images"
                              >
                                {uploadingIcon && uploadingTarget?.type === "banner" && uploadingTarget?.bIdx === index ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <Upload size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">CTA Route Path</label>
                            <RouteSelector 
                              value={banner.cta_route || ""} 
                              onChange={(val) => updateBanner(index, "cta_route", val)}
                              placeholder="/doctor-visit"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab Content: Sections & Services Grid */}
                {activeTab === "form-sections" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {(parsedConfig.sections || []).map((section, sIdx) => (
                      <div key={section.id || sIdx} className="card" style={{ border: "1px solid var(--border-color)" }}>
                        
                        {/* Section Header */}
                        <div className="card-header" style={{ 
                          backgroundColor: "rgba(0,0,0,0.02)",
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          padding: "10px 14px" 
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Layers size={16} className="text-muted" />
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{section.title || section.id}</span>
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, backgroundColor: "#E5E7EB", color: "#374151", fontWeight: 600 }}>
                              {section.type}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                              <input 
                                type="checkbox" 
                                checked={!!section.enabled} 
                                onChange={(e) => updateSection(sIdx, "enabled", e.target.checked)}
                              />
                              Enabled Section
                            </label>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-danger" 
                              onClick={() => removeSection(sIdx)}
                              title="Delete Section"
                              style={{ padding: "2px 6px" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Section Settings */}
                        <div className="card-body" style={{ padding: 14 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 80px 80px", gap: 12, marginBottom: 16 }}>
                            <div className="form-group">
                              <label className="form-label">Display Title</label>
                              <input 
                                type="text" 
                                className="form-input" 
                                value={section.title || ""} 
                                onChange={(e) => updateSection(sIdx, "title", e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Section Type</label>
                              <select 
                                className="form-input" 
                                value={section.type || "custom_card"} 
                                onChange={(e) => updateSection(sIdx, "type", e.target.value)}
                              >
                                <option value="quick_services">Quick Services Strip (quick_services)</option>
                                <option value="service_grid">Services Grid (service_grid)</option>
                                <option value="essentials_grid">Essentials Grid (essentials_grid)</option>
                                <option value="custom_card">Custom Banner Card (custom_card)</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Max Items</label>
                              <input 
                                type="number" 
                                className="form-input" 
                                value={section.max_items || 0} 
                                onChange={(e) => updateSection(sIdx, "max_items", parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Sort Order</label>
                              <input 
                                type="number" 
                                className="form-input" 
                                value={section.sort_order || 0} 
                                onChange={(e) => updateSection(sIdx, "sort_order", parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>

                          {/* Custom Card / Banner Card Fields */}
                          {(section.type === "custom_card" || section.type === "banner_card") && (
                            <div style={{ 
                              backgroundColor: "var(--bg-muted)", 
                              padding: 12, 
                              borderRadius: 8, 
                              marginBottom: 16, 
                              display: "grid", 
                              gridTemplateColumns: "1fr 1fr", 
                              gap: 12 
                            }}>
                              <div className="form-group">
                                <label className="form-label">Subtitle Text</label>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  value={section.subtitle || ""} 
                                  onChange={(e) => updateSection(sIdx, "subtitle", e.target.value)}
                                  placeholder="Tell us where you want to go."
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">CTA Button Text</label>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  value={section.cta_text || ""} 
                                  onChange={(e) => updateSection(sIdx, "cta_text", e.target.value)}
                                  placeholder="Share Now"
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Target Expo Route Path</label>
                                <RouteSelector 
                                  value={section.view_all_route || ""} 
                                  onChange={(val) => updateSection(sIdx, "view_all_route", val)}
                                  placeholder="/trip-travels"
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Background Image (Asset / GCS)</label>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <input 
                                    type="text" 
                                    className="form-input" 
                                    value={section.image_url || ""} 
                                    onChange={(e) => updateSection(sIdx, "image_url", e.target.value)}
                                    placeholder="banner.png or URL"
                                    style={{ flex: 1 }}
                                  />
                                  <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => triggerUpload({ type: "section_image", sIdx })}
                                    disabled={uploadingIcon && uploadingTarget?.type === "section_image" && uploadingTarget?.sIdx === sIdx}
                                  >
                                    {uploadingIcon && uploadingTarget?.type === "section_image" && uploadingTarget?.sIdx === sIdx ? (
                                      <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                      <Upload size={14} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Services List inside this section */}
                          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                            <h5 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                              Services & Grid Items ({section.services?.length || 0})
                            </h5>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {(section.services || []).map((service, svIdx) => (
                                <div key={service.id} style={{ 
                                  display: "flex", 
                                  alignItems: "center", 
                                  gap: 12, 
                                  backgroundColor: "var(--bg-muted)", 
                                  padding: 8, 
                                  borderRadius: 6,
                                  border: "1px solid var(--border-color)"
                                }}>
                                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                                    <input 
                                      type="checkbox" 
                                      checked={!!service.enabled} 
                                      onChange={(e) => updateService(sIdx, svIdx, "enabled", e.target.checked)}
                                    />
                                  </label>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 60px", gap: 8, flex: 1 }}>
                                    <div>
                                      <input 
                                        type="text" 
                                        placeholder="Label" 
                                        className="form-input" 
                                        value={service.label || ""} 
                                        onChange={(e) => updateService(sIdx, svIdx, "label", e.target.value)}
                                        style={{ height: 28, fontSize: 11, padding: "2px 6px" }}
                                      />
                                    </div>
                                    <div>
                                      <RouteSelector 
                                        compact
                                        value={service.route || ""} 
                                        onChange={(val) => updateService(sIdx, svIdx, "route", val)}
                                        placeholder="Expo Route"
                                      />
                                    </div>
                                    <div>
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <input 
                                          type="text" 
                                          placeholder="Icon Asset" 
                                          className="form-input" 
                                          value={service.icon || ""} 
                                          onChange={(e) => updateService(sIdx, svIdx, "icon", e.target.value)}
                                          style={{ height: 28, fontSize: 11, padding: "2px 6px", flex: 1, minWidth: 0 }}
                                        />
                                        <button 
                                          type="button" 
                                          onClick={() => triggerUpload({ type: "service", sIdx, svIdx })}
                                          disabled={uploadingIcon && uploadingTarget?.type === "service" && uploadingTarget?.sIdx === sIdx && uploadingTarget?.svIdx === svIdx}
                                          style={{ 
                                            padding: "0 6px", 
                                            height: 28, 
                                            borderRadius: 4, 
                                            backgroundColor: "var(--bg-muted)", 
                                            border: "1px solid var(--border-color)", 
                                            cursor: "pointer",
                                            display: "flex", 
                                            alignItems: "center", 
                                            justifyContent: "center",
                                            opacity: uploadingIcon && uploadingTarget?.type === "service" && uploadingTarget?.sIdx === sIdx && uploadingTarget?.svIdx === svIdx ? 0.7 : 1 
                                          }}
                                          title="Upload icon to GCS path ayuxa-assets/mobile/assets/images"
                                        >
                                          {uploadingIcon && uploadingTarget?.type === "service" && uploadingTarget?.sIdx === sIdx && uploadingTarget?.svIdx === svIdx ? (
                                            <Loader2 className="animate-spin" size={12} />
                                          ) : (
                                            <Upload size={12} />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <input 
                                        type="number" 
                                        placeholder="Order" 
                                        className="form-input" 
                                        value={service.sort_order || 0} 
                                        onChange={(e) => updateService(sIdx, svIdx, "sort_order", parseInt(e.target.value) || 0)}
                                        style={{ height: 28, fontSize: 11, padding: "2px 6px" }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}

                    {/* Add New Section Controls */}
                    <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                      <button 
                        type="button" 
                        className="btn btn-outline-primary" 
                        onClick={() => addSection("custom_card")}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Plus size={16} /> Add Custom Banner Card Section
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary" 
                        onClick={() => addSection("service_grid")}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Plus size={16} /> Add Grid Service Section
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab Content: Trust Badges */}
                {activeTab === "form-badges" && (
                  <div className="card">
                    <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <h4 style={{ margin: 0 }}>Trust Badge strip</h4>
                      
                      {(parsedConfig.trust_badges || []).map((badge, index) => (
                        <div key={badge.id} style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 12, 
                          padding: "10px 14px", 
                          backgroundColor: "var(--bg-muted)", 
                          borderRadius: 6,
                          border: "1px solid var(--border-color)"
                        }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input 
                              type="checkbox" 
                              checked={!!badge.enabled} 
                              onChange={(e) => updateTrustBadge(index, "enabled", e.target.checked)}
                            />
                            Active
                          </label>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12, flex: 1 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Badge Label"
                                value={badge.label || ""} 
                                onChange={(e) => updateTrustBadge(index, "label", e.target.value)}
                                style={{ height: 32, fontSize: 12 }}
                              />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Icon Filename"
                                value={badge.icon || ""} 
                                onChange={(e) => updateTrustBadge(index, "icon", e.target.value)}
                                style={{ height: 32, fontSize: 12 }}
                              />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <input 
                                type="number" 
                                className="form-input" 
                                placeholder="Order"
                                value={badge.sort_order || 0} 
                                onChange={(e) => updateTrustBadge(index, "sort_order", parseInt(e.target.value) || 0)}
                                style={{ height: 32, fontSize: 12 }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Right Side: Interactive Mobile Preview Mock */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card-header" style={{ padding: "0 4px", display: "flex", alignItems: "center", gap: 8 }}>
              <Smartphone size={20} className="text-muted" />
              <h3 style={{ margin: 0 }}>Live UI Preview Mock</h3>
            </div>

            {/* Simulated Phone Shell Container */}
            <div style={{
              width: 380,
              height: 720,
              borderRadius: 36,
              border: "12px solid #22252A",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              backgroundColor: "#F3F4F6",
              overflow: "hidden",
              position: "relative",
              display: "flex",
              flexDirection: "column"
            }}>
              {/* Phone Camera Notch notch */}
              <div style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 140,
                height: 24,
                backgroundColor: "#22252A",
                borderBottomLeftRadius: 18,
                borderBottomRightRadius: 18,
                zIndex: 99
              }} />

              {/* Screen Content Scroll Box */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "36px 16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}>
                {parsedConfig ? (
                  <>
                    {/* Mock Status & Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>ayuxa</span>
                      <span style={{ fontSize: 12, backgroundColor: "#E5E7EB", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>Bangalore</span>
                    </div>

                    {/* Greeting Box */}
                    {parsedConfig.greeting_banner?.enabled !== false && (
                      <div style={{ padding: 14, backgroundColor: "#02743F", borderRadius: 16, color: "#FFF", flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>Good morning, John!</div>
                        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                          {parsedConfig.greeting_banner?.subtitle || "We see you. We hear you. We care."}
                        </div>
                      </div>
                    )}

                    {/* Real Carousel Banners Preview */}
                    {carouselBanners.length > 0 && (
                      <div style={{ 
                        backgroundColor: "#EAEFFF", 
                        borderRadius: 16, 
                        border: "1px solid #D1DEFE",
                        position: "relative",
                        overflow: "hidden",
                        height: 110,
                        flexShrink: 0
                      }}>
                        <img 
                          src={getImageUrl(carouselBanners[0].imageUrl)} 
                          alt={carouselBanners[0].heading} 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                        <div style={{ 
                          position: "absolute", 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", 
                          padding: "16px 12px 10px",
                          color: "#FFF" 
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{carouselBanners[0].heading}</div>
                          {carouselBanners[0].subheading && <div style={{ fontSize: 10, opacity: 0.9 }}>{carouselBanners[0].subheading}</div>}
                        </div>
                      </div>
                    )}

                    {/* SDUI Layout Sections Map */}
                    {parsedConfig.sections?.filter(s => s.enabled).sort((a,b) => (a.sort_order || 99) - (b.sort_order || 99)).map(section => {
                      
                      // Section 1: Quick Services Strip
                      if (section.type === "quick_services") {
                        return (
                          <div key={section.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", flexShrink: 0 }}>
                            {section.services?.filter(sv => sv.enabled).slice(0, 4).map(svc => (
                              <div key={svc.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "22%" }}>
                                <div style={{ 
                                  width: 48, 
                                  height: 48, 
                                  borderRadius: 12, 
                                  backgroundColor: "#E8F5E9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 18,
                                  overflow: "hidden"
                                }}>
                                  {svc.icon && !isEmoji(svc.icon) ? (
                                    <img src={getImageUrl(svc.icon)} alt={svc.id} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    svc.icon || "🩺"
                                  )}
                                </div>
                                <span style={{ fontSize: 9, fontWeight: 600, textAlign: "center", color: "#374151", whiteSpace: "pre-line" }}>
                                  {(() => {
                                    try {
                                      const parsed = JSON.parse(svc.label);
                                      return parsed.en || svc.id;
                                    } catch (e) {
                                      return svc.label || svc.id;
                                    }
                                  })()}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      // Section 2: Diagnostics & Fitness Grid
                      if (section.type === "service_grid") {
                        return (
                          <div key={section.id} style={{ backgroundColor: "#FFF", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#1F2937" }}>{section.title}</span>
                              <span style={{ fontSize: 10, color: "#02743F", fontWeight: 600 }}>View All</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                              {section.services?.filter(sv => sv.enabled).slice(0, section.max_items || 6).map(svc => (
                                <div key={svc.id} style={{ 
                                  padding: 10, 
                                  borderRadius: 12, 
                                  backgroundColor: "#F9FAFB", 
                                  border: "1px solid #F3F4F6",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 6
                                }}>
                                  <div style={{ 
                                    width: 32, 
                                    height: 32, 
                                    display: "flex", 
                                    alignItems: "center", 
                                    justifyContent: "center",
                                    fontSize: 20,
                                    overflow: "hidden"
                                  }}>
                                    {svc.icon && !isEmoji(svc.icon) ? (
                                      <img src={getImageUrl(svc.icon)} alt={svc.id} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />
                                    ) : (
                                      svc.icon || "📦"
                                    )}
                                  </div>
                                  <span style={{ fontSize: 9, fontWeight: 600, color: "#4B5563", textAlign: "center" }}>
                                    {(() => {
                                      let lbl = svc.label;
                                      try {
                                        const parsed = JSON.parse(svc.label);
                                        lbl = parsed.en || svc.id;
                                      } catch (e) {
                                        lbl = svc.label || svc.id;
                                      }
                                      return lbl.replace(/\n/g, " ").replace(/\\n/g, " ");
                                    })()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Section 3: Essentials Grid
                      if (section.type === "essentials_grid") {
                        return (
                          <div key={section.id} style={{ backgroundColor: "#FFF", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#1F2937" }}>{section.title}</span>
                              <span style={{ fontSize: 10, color: "#02743F", fontWeight: 600 }}>View All</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                              {section.services?.filter(sv => sv.enabled).slice(0, section.max_items || 8).map(svc => (
                                <div key={svc.id} style={{ 
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 4
                                }}>
                                  <div style={{ 
                                    width: 44, 
                                    height: 44, 
                                    borderRadius: 10, 
                                    backgroundColor: "#F3F4F6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 16,
                                    overflow: "hidden"
                                  }}>
                                    {svc.icon && !isEmoji(svc.icon) ? (
                                      <img src={getImageUrl(svc.icon)} alt={svc.id} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                      svc.icon || "🛠️"
                                    )}
                                  </div>
                                  <span style={{ fontSize: 8, color: "#4B5563", fontWeight: 600, textAlign: "center" }}>
                                    {(() => {
                                      let lbl = svc.label;
                                      try {
                                        const parsed = JSON.parse(svc.label);
                                        lbl = parsed.en || svc.id;
                                      } catch (e) {
                                        lbl = svc.label || svc.id;
                                      }
                                      return lbl.replace(/\n/g, " ").replace(/\\n/g, " ");
                                    })()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      
                      // Section 4: Custom Banner Card
                      else if (section.type === "custom_card" || section.type === "banner_card") {
                        return (
                          <div 
                            key={section.id} 
                            style={{ 
                              position: "relative",
                              borderRadius: 16, 
                              height: 150, 
                              flexShrink: 0,
                              overflow: "hidden",
                              backgroundColor: "#1F2937",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "flex-end",
                              padding: 14,
                              gap: 8
                            }}
                          >
                            <img 
                              src={getImageUrl(section.image_url) || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"} 
                              alt={section.title || "Banner"} 
                              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} 
                            />
                            <div style={{ backgroundColor: "rgba(0,0,0,0.35)", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} />
                            <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 3 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#FFF", lineHeight: "17px" }}>{section.title || "Untitled Card"}</div>
                              {section.subtitle ? (
                                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.9)", lineHeight: "13px" }}>{section.subtitle}</div>
                              ) : null}
                            </div>
                            {section.cta_text ? (
                              <div style={{ 
                                position: "relative", 
                                zIndex: 2, 
                                alignSelf: "flex-start",
                                backgroundColor: "#02743F",
                                color: "#FFF",
                                borderRadius: 20,
                                padding: "5px 12px",
                                fontSize: 9.5,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: 4
                              }}>
                                <span>{section.cta_text}</span>
                                <span>→</span>
                              </div>
                            ) : null}
                          </div>
                        );
                      }

                      return null;
                    })}

                    {/* Trust Badges Section */}
                    {parsedConfig.trust_badges?.some(b => b.enabled) && (
                      <div style={{ display: "flex", justifyContent: "space-around", backgroundColor: "#FFF", borderRadius: 16, padding: 10, border: "1px dashed #E5E7EB", flexShrink: 0 }}>
                        {parsedConfig.trust_badges.filter(b => b.enabled).map(badge => (
                          <div key={badge.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 12 }}>🛡️</span>
                            <span style={{ fontSize: 8, fontWeight: 700, color: "#6B7280" }}>{badge.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SOS Banner Section */}
                    {parsedConfig.sos_banner?.enabled && (
                      <div style={{ 
                        padding: 12, 
                        borderRadius: 16, 
                        background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                        color: "#FFF",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexShrink: 0
                      }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>{parsedConfig.sos_banner.title_line1}</div>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>{parsedConfig.sos_banner.title_line2}</div>
                        </div>
                        <div style={{ backgroundColor: "#FFF", color: "#DC2626", fontSize: 9, fontWeight: 800, padding: "4px 8px", borderRadius: 6 }}>
                          {parsedConfig.sos_banner.cta_text}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, padding: 20 }}>
                    <AlertTriangle size={32} className="text-danger" />
                    <span style={{ fontSize: 13, color: "#EF4444", fontWeight: 600, textAlign: "center" }}>
                      Invalid Layout configuration state.
                    </span>
                  </div>
                )}
              </div>
              
              {/* Bottom Mobile Navigation Bar */}
              <div style={{
                height: 48,
                backgroundColor: "#FFFFFF",
                borderTop: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                padding: "0 12px"
              }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#02743F" }}>
                  <span style={{ fontSize: 12 }}>🏠</span>
                  <span style={{ fontSize: 8, fontWeight: 700 }}>Home</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#9CA3AF" }}>
                  <span style={{ fontSize: 12 }}>📅</span>
                  <span style={{ fontSize: 8, fontWeight: 600 }}>Bookings</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#9CA3AF" }}>
                  <span style={{ fontSize: 12 }}>📋</span>
                  <span style={{ fontSize: 8, fontWeight: 600 }}>Records</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#9CA3AF" }}>
                  <span style={{ fontSize: 12 }}>👤</span>
                  <span style={{ fontSize: 8, fontWeight: 600 }}>Profile</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
