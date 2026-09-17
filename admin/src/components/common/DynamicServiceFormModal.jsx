"use client";
import { useState, useEffect } from "react";
import {
    PlusCircle, Trash, ArrowUp, ArrowDown, Upload
} from "lucide-react";
import { serviceAPI, serviceCategoryAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";
import RouteSelector from "@/components/common/RouteSelector";
import FileUploadField from "@/components/common/FileUploadField";

const isEmoji = (str) => {
    if (!str) return false;
    const clean = str.trim();
    return clean.length <= 4 && !clean.includes('.') && !clean.includes('/') && !clean.includes(':');
};

const DEFAULT_FORM_FIELDS = [
    {
        id: "benefits",
        type: "benefits",
        label: "Service Benefits List",
        placeholder: "",
        required: false,
        optionsString: "Covered under your Ayuxa health plan benefits, Certified and safe professionals, 24/7 dedicated support tracking"
    },
    {
        id: "address_picker",
        type: "address_picker",
        label: "Confirm Address",
        placeholder: "",
        required: true,
        optionsString: ""
    },
    {
        id: "datetime",
        type: "datetime",
        label: "Schedule Appointment",
        placeholder: "Select Date & Time",
        required: true,
        optionsString: ""
    },
    {
        id: "comments",
        type: "comments",
        label: "Comments / Requirements",
        placeholder: "Describe your requirements or any instructions here...",
        required: true,
        optionsString: ""
    }
];

const buildEmptyForm = (category, sortOrder) => ({
    name: "",
    slug: "",
    icon: "🩺",
    route: "",
    headline: "",
    subhead: "",
    description: "",
    checkoutGroup: "D",
    basePrice: 0,
    pricingText: "Submit Request",
    sortOrder,
    isEnabled: true,
    category,
    categoryId: "",
    isDynamic: true,
    serviceType: "OTHER",
    paymentMode: "INQUIRY",
    changeReason: ""
});

/**
 * Dynamic Service Creator & Form Builder — extracted from ServicesPage.jsx
 * so Home Essentials, Diagnostic & Fitness, and Tours & Travel can each
 * reuse the exact same creation/edit flow, pre-locked to their own
 * `category` tag. Behavior is preserved exactly as it was in ServicesPage.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onSaved: () => void          — called after a successful create/update
 *  - editingService: Service|null — pass a service row to edit, null to add
 *  - category: string             — locked category value for new services
 *  - categoryOptions: [{ value, label }] — optional; if provided renders a
 *      category <select> instead of a locked hidden value (Home Essentials/
 *      Diagnostic & Fitness/Tours & Travel each have exactly one category,
 *      so by default the category field is just fixed and hidden from the
 *      admin — pass categoryOptions only if a page truly needs the choice).
 *  - defaultSortOrder: number      — sortOrder to prefill when adding
 */
export default function DynamicServiceFormModal({
    open,
    onClose,
    onSaved,
    editingService = null,
    category,
    categoryOptions = null,
    defaultSortOrder = 1,
}) {
    const [iconType, setIconType] = useState("emoji");
    const [form, setForm] = useState(buildEmptyForm(category, defaultSortOrder));
    const [formFields, setFormFields] = useState(DEFAULT_FORM_FIELDS);
    const [serviceCategories, setServiceCategories] = useState([]);

    // Categories are scoped per-module (Home Essentials/Diagnostic & Fitness/
    // Tours & Travel each manage their own) — reload whenever the modal opens
    // for a given module, so a category created moments ago in the other tab
    // shows up here without a page refresh.
    useEffect(() => {
        if (!open) return;
        serviceCategoryAPI.getAll(category)
            .then(res => setServiceCategories((res.data?.data || []).filter(c => c.isEnabled)))
            .catch(() => setServiceCategories([]));
    }, [open, category]);

    // Blood test is the one diagnostic whose per-test Service Fee comes from the
    // Redcliffe Labs API, not from admin config — its price fields are read-only here.
    const isBloodTestService = form.slug === "blood-test" || form.route === "/blood-test";

    /* eslint-disable react-hooks/set-state-in-effect -- resetting the
       form's local state to match `editingService` when the modal opens
       for a (possibly different) item; there's no external system to
       synchronize with here, just deriving state from a prop change. */
    useEffect(() => {
        if (!open) return;
        if (editingService) {
            setIconType(isEmoji(editingService.icon) ? "emoji" : "image");
            setForm({
                name: editingService.name || "",
                slug: editingService.slug || "",
                icon: editingService.icon || "🩺",
                route: editingService.route || "",
                headline: editingService.headline || "",
                subhead: editingService.subhead || "",
                description: editingService.description || "",
                checkoutGroup: editingService.checkoutGroup || "D",
                basePrice: editingService.basePrice !== null && editingService.basePrice !== undefined ? editingService.basePrice : 0,
                pricingText: editingService.pricingText || "",
                sortOrder: editingService.sortOrder || 1,
                isEnabled: editingService.isEnabled ?? true,
                category: editingService.category || category,
                categoryId: editingService.categoryId || "",
                isDynamic: editingService.isDynamic !== undefined ? !!editingService.isDynamic : false,
                serviceType: editingService.serviceType || "OTHER",
                paymentMode: editingService.paymentMode || "INQUIRY",
                changeReason: ""
            });

            const fields = [];
            if (editingService.formFieldsJson?.sections?.[0]?.fields?.length > 0) {
                editingService.formFieldsJson.sections[0].fields.forEach((f) => {
                    fields.push({
                        id: f.id,
                        type: f.type,
                        label: f.label || "",
                        placeholder: f.placeholder || "",
                        required: !!f.required,
                        optionsString: f.options ? f.options.map(o => o.price !== undefined ? `${o.label}: ${o.price}` : o.label).join(", ") : ""
                    });
                });
                setFormFields(fields);
            } else {
                setFormFields(DEFAULT_FORM_FIELDS);
            }
        } else {
            setIconType("emoji");
            setForm(buildEmptyForm(category, defaultSortOrder));
            setFormFields(DEFAULT_FORM_FIELDS);
        }
    }, [open, editingService, category, defaultSortOrder]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const addFormField = () => {
        const nextId = `field_${Date.now()}`;
        setFormFields([...formFields, {
            id: nextId,
            type: "text_input",
            label: "",
            placeholder: "",
            required: false,
            optionsString: ""
        }]);
    };

    const updateFormField = (index, key, value) => {
        const updated = [...formFields];
        updated[index] = { ...updated[index], [key]: value };
        setFormFields(updated);
    };

    const removeFormField = (index) => {
        setFormFields(formFields.filter((_, i) => i !== index));
    };

    const moveFieldUp = (index) => {
        if (index === 0) return;
        const updated = [...formFields];
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
        setFormFields(updated);
    };

    const moveFieldDown = (index) => {
        if (index === formFields.length - 1) return;
        const updated = [...formFields];
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
        setFormFields(updated);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // PAID mode must have a real charge amount — Razorpay can't process a
        // ₹0 order, so this combination would silently break checkout.
        if (form.paymentMode === "PAID" && (!form.basePrice || parseFloat(form.basePrice) <= 0)) {
            showToast("PAID services need a Base Price greater than ₹0 — Razorpay can't charge ₹0. Switch to INQUIRY mode or set a real price.", "error");
            return;
        }

        try {
            const routeVal = form.route || `/dynamic-service/${form.slug}`;

            const serializedFields = formFields.map((f, index) => ({
                id: f.id || `field_${index}`,
                type: f.type,
                label: f.label,
                placeholder: f.placeholder,
                required: f.required,
                options: ["radio", "dropdown", "checkbox", "benefits"].includes(f.type) && f.optionsString
                    ? f.optionsString.split(",").map((opt, optIdx) => {
                        const parts = opt.split(":");
                        const labelStr = parts[0].trim();
                        const priceVal = parts[1] ? parseFloat(parts[1].trim()) : undefined;
                        return {
                            id: labelStr.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                            label: labelStr,
                            ...(priceVal !== undefined && !isNaN(priceVal) && { price: priceVal }),
                            sort_order: optIdx + 1
                        };
                    })
                    : undefined
            }));

            const formFieldsJsonObj = {
                version: 1,
                layout: {
                    header_style: "cream_flat",
                    description: form.subhead || form.headline || "",
                    cta_text: form.pricingText || "Submit Request"
                },
                sections: [{
                    id: "dynamic_section",
                    title: form.headline || "Service Details",
                    sort_order: 1,
                    card_style: "default",
                    fields: serializedFields
                }]
            };

            const payload = {
                ...form,
                route: routeVal,
                basePrice: parseFloat(form.basePrice) || 0,
                sortOrder: parseInt(form.sortOrder, 10) || 1,
                categoryId: form.categoryId || null,
                formFieldsJson: formFieldsJsonObj
            };

            if (editingService) {
                await serviceAPI.update(editingService.id, payload);
                showToast("Dynamic service updated successfully", "success");
            } else {
                await serviceAPI.create(payload);
                showToast("Dynamic service created successfully", "success");
            }

            onClose();
            onSaved?.();
        } catch (err) {
            showToast(err.response?.data?.message || "Operation failed", "error");
        }
    };

    if (!open) return null;

    return (
        <div className="modal-overlay active" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 750, width: "95%" }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h3>{editingService ? "Edit Dynamic Service" : "Add Dynamic Service"}</h3>
                        <p className="text-xs text-muted">Create custom inputs and forms rendered instantly on user devices</p>
                    </div>
                    <button onClick={onClose} className="close-x">✕</button>
                </div>
                <form onSubmit={handleSave}>
                    <div className="modal-body" style={{ maxHeight: "calc(80vh - 140px)", overflowY: "auto", padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>

                        {/* Section 1: Basic Service Identity */}
                        <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", background: "var(--bg-glass)" }}>
                            <h5 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "var(--accent-primary)", borderBottom: "1px solid rgba(4, 131, 87, 0.08)", paddingBottom: "8px" }}>1. Service Identity</h5>

                            <div className="form-grid-2" style={{ marginBottom: "16px" }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Service Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        placeholder="e.g. Home ECG"
                                        value={form.name}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setForm({
                                                ...form,
                                                name: val,
                                                slug: editingService ? form.slug : val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
                                            });
                                        }}
                                    />
                                </div>
                            <div className="form-grid-2" style={{ marginBottom: "16px", alignItems: "end" }}>
                                {categoryOptions ? (
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Category *</label>
                                        <select
                                            className="form-input"
                                            style={{ cursor: "pointer" }}
                                            value={form.category}
                                            onChange={e => setForm({ ...form, category: e.target.value })}
                                        >
                                            {categoryOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Category</label>
                                        <input className="form-input" value={form.category} disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
                                    </div>
                                )}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ marginBottom: 8 }}>Service Icon Type</label>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${iconType === 'emoji' ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ flex: 1, padding: "6px 12px", fontSize: "12px" }}
                                            onClick={() => { setIconType('emoji'); setForm(prev => ({ ...prev, icon: "🩺" })); }}
                                        >
                                            Emoji Icon
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${iconType === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ flex: 1, padding: "6px 12px", fontSize: "12px" }}
                                            onClick={() => { setIconType('image'); setForm(prev => ({ ...prev, icon: "" })); }}
                                        >
                                            GCS Image
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                {iconType === 'emoji' ? (
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Emoji *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            required
                                            placeholder="🩺"
                                            maxLength={50}
                                            value={form.icon}
                                            onChange={e => setForm({ ...form, icon: e.target.value })}
                                        />
                                    </div>
                                ) : (
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Service Icon Image (GCS) *</label>
                                        <FileUploadField
                                            value={form.icon && !isEmoji(form.icon) ? form.icon : ""}
                                            onChange={(url) => setForm(prev => ({ ...prev, icon: url }))}
                                            folder="service-icons"
                                        />
                                    </div>
                                )}
                            </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: "16px" }}>
                                <label className="form-label">Group under Category (optional)</label>
                                <select
                                    className="form-input"
                                    style={{ cursor: "pointer" }}
                                    value={form.categoryId}
                                    onChange={e => setForm({ ...form, categoryId: e.target.value })}
                                >
                                    <option value="">No category — show ungrouped</option>
                                    {serviceCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {serviceCategories.length === 0 && (
                                    <p className="text-xs text-muted" style={{ margin: "4px 0 0" }}>
                                        No categories yet — create one in the Categories tab first if you want to group services.
                                    </p>
                                )}
                            </div>

                            <div className="form-grid-2">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Service Slug *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        placeholder="e.g. home-ecg"
                                        value={form.slug}
                                        onChange={e => setForm({ ...form, slug: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Service Architecture Type *</label>
                                    <select
                                        className="form-input"
                                        style={{ cursor: "pointer" }}
                                        value={form.isDynamic ? "dynamic" : "core"}
                                        onChange={e => setForm({ ...form, isDynamic: e.target.value === "dynamic" })}
                                    >
                                        <option value="core">Core Built-in Page (Native Code / Direct Route)</option>
                                        <option value="dynamic">Dynamic SDUI Page (Form Builder / SDUI)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: "16px", marginBottom: 0 }}>
                                <label className="form-label">Service Route Path (Optional)</label>
                                <RouteSelector
                                    value={form.route}
                                    onChange={val => setForm({ ...form, route: val })}
                                    placeholder="Auto: /dynamic-service/[slug]"
                                />
                            </div>
                        </div>

                        {/* Section 2: Mobile App Presentation */}
                        <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", background: "var(--bg-glass)" }}>
                            <h5 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "var(--accent-primary)", borderBottom: "1px solid rgba(4, 131, 87, 0.08)", paddingBottom: "8px" }}>2. App Presentation Details</h5>

                            <div className="form-group" style={{ marginBottom: "16px" }}>
                                <label className="form-label">App Headline *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    required
                                    placeholder="One headline displayed on the card (e.g. Home ECG Service)"
                                    value={form.headline}
                                    onChange={e => setForm({ ...form, headline: e.target.value })}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: "16px" }}>
                                <label className="form-label">App Subhead *</label>
                                <textarea
                                    className="form-textarea"
                                    required
                                    rows={2}
                                    style={{ minHeight: "80px" }}
                                    placeholder="One descriptive line below the headline"
                                    value={form.subhead}
                                    onChange={e => setForm({ ...form, subhead: e.target.value })}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Description (internal — not shown in the app)</label>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    style={{ minHeight: "100px" }}
                                    placeholder="Longer notes for admin reference — what this service covers, eligibility, ops notes, etc."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Section 3: Pricing & Checkout Configuration */}
                        <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", background: "var(--bg-glass)" }}>
                            <h5 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "var(--accent-primary)", borderBottom: "1px solid rgba(4, 131, 87, 0.08)", paddingBottom: "8px" }}>3. Pricing & Checkout Config</h5>

                            {isBloodTestService && (
                                <div style={{
                                    marginBottom: "16px", fontSize: 13, padding: "10px 14px", borderRadius: 8,
                                    background: "rgba(59, 130, 246, 0.12)", color: "#2563EB", lineHeight: 1.5,
                                }}>
                                    🩸 <strong>Blood Test — Service Fee is partner-controlled.</strong> Individual test prices are fetched live from the <strong>Redcliffe Labs API</strong> per package, so the Base Price below is <strong>not charged to the customer</strong> — it is only a display/reference figure. The Ayuxa Booking Fee, Platform Fee and Tax are set under <strong>Pricing → Service Charges</strong> for the <em>Blood Test</em> category.
                                </div>
                            )}

                            {form.category === "HOME_ESSENTIALS" ? (
                                <div className="form-grid-3" style={{ marginBottom: "16px" }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Checkout Group *</label>
                                        <select
                                            className="form-input"
                                            style={{ cursor: "pointer" }}
                                            value={form.checkoutGroup}
                                            onChange={e => setForm({ ...form, checkoutGroup: e.target.value })}
                                        >
                                            <option value="A">Group A: ₹299 + Date + Photo</option>
                                            <option value="B">Group B: ₹299 + Photo only</option>
                                            <option value="C">Group C: Tech Support split pricing</option>
                                            <option value="D">Group D: Zero Payment Request</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Base Price (₹) *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            required
                                            min={0}
                                            value={form.basePrice}
                                            onChange={e => setForm({ ...form, basePrice: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Pricing Subtext *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            required
                                            placeholder="e.g. ₹299 Fee + actuals"
                                            value={form.pricingText}
                                            onChange={e => setForm({ ...form, pricingText: e.target.value })}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="form-grid-3" style={{ marginBottom: "16px" }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Payment Mode *</label>
                                        <select
                                            className="form-input"
                                            style={{ cursor: "pointer" }}
                                            value={form.paymentMode || "INQUIRY"}
                                            disabled={isBloodTestService}
                                            onChange={e => setForm({ ...form, paymentMode: e.target.value })}
                                        >
                                            <option value="INQUIRY">INQUIRY (No Payment)</option>
                                            <option value="PAID">PAID (Razorpay Checkout)</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">
                                            {isBloodTestService ? "Service Fee — set by Redcliffe API" : "Base Price (₹) *"}
                                        </label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            required={!isBloodTestService}
                                            disabled={isBloodTestService}
                                            readOnly={isBloodTestService}
                                            min={0}
                                            placeholder={isBloodTestService ? "Fetched live per test package" : undefined}
                                            value={isBloodTestService ? "" : form.basePrice}
                                            onChange={e => setForm({ ...form, basePrice: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Pricing Subtext *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            required
                                            placeholder="e.g. Pay ₹0 / Submit Request"
                                            value={form.pricingText}
                                            onChange={e => setForm({ ...form, pricingText: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {editingService && (
                                <div className="form-group" style={{ marginBottom: "16px" }}>
                                    <label className="form-label">Reason for change (optional)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Seasonal discount, vendor rate change..."
                                        value={form.changeReason}
                                        onChange={e => setForm({ ...form, changeReason: e.target.value })}
                                    />
                                </div>
                            )}

                            {form.paymentMode === "PAID" && (!form.basePrice || parseFloat(form.basePrice) <= 0) && (
                                <div style={{
                                    marginBottom: "16px", fontSize: 13, padding: "10px 14px", borderRadius: 8,
                                    background: "rgba(255, 193, 7, 0.12)", color: "#B8860B",
                                }}>
                                    ⚠️ PAID mode requires a Base Price above ₹0 — Razorpay cannot charge ₹0. This service can&apos;t be saved until you set a real price or switch to INQUIRY mode.
                                </div>
                            )}

                            <div className="form-grid-2" style={{ alignItems: "center" }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Sort Order (Sort position)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={form.sortOrder}
                                        onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 1 })}
                                    />
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingSelf: "center", height: "100%", paddingTop: "24px" }}>
                                    <input
                                        type="checkbox"
                                        id="isEnabled"
                                        style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--accent-primary)" }}
                                        checked={form.isEnabled}
                                        onChange={e => setForm({ ...form, isEnabled: e.target.checked })}
                                    />
                                    <label htmlFor="isEnabled" className="font-bold cursor-pointer" style={{ margin: 0, fontSize: "13.5px", color: "var(--text-secondary)" }}>Publish Service (Make Live)</label>
                                </div>
                            </div>
                        </div>
                         {/* VISUAL FORM BUILDER */}
                         <div className="form-builder-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: 24, marginTop: 24, marginBottom: 16 }}>
                             <div>
                                 <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "var(--accent-primary)" }}>Form Fields Builder</h4>
                                 <p className="text-xs text-muted" style={{ margin: 0 }}>Configure form inputs required from the user during booking</p>
                             </div>
                             <button type="button" className="btn btn-secondary btn-sm" style={{ padding: "6px 12px", borderRadius: "var(--radius-md)" }} onClick={addFormField}>
                                 <PlusCircle size={14} /> Add Input Field
                             </button>
                         </div>

                         <div className="form-builder-list" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                             {formFields.length === 0 ? (
                                 <div className="text-center text-muted text-sm" style={{ border: "2px dashed var(--border-color)", padding: 32, borderRadius: "var(--radius-lg)", background: "var(--bg-glass)" }}>
                                     No custom fields defined. Click &quot;Add Input Field&quot; above to start building your form.
                                 </div>
                             ) : (
                                 formFields.map((field, idx) => (
                                     <div key={field.id || idx} style={{ position: "relative", background: "var(--bg-glass)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", transition: "all 0.2s" }}>
                                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid rgba(4, 131, 87, 0.08)", paddingBottom: 8 }}>
                                             <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--accent-primary)", background: "rgba(4, 131, 87, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                                                 Field #{idx + 1}
                                             </span>
                                             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                 <button
                                                     type="button"
                                                     disabled={idx === 0}
                                                     style={{ border: "none", background: "none", color: idx === 0 ? "var(--text-muted)" : "var(--accent-primary)", cursor: idx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", padding: "4px" }}
                                                     onClick={() => moveFieldUp(idx)}
                                                 >
                                                     <ArrowUp size={16} />
                                                 </button>
                                                 <button
                                                     type="button"
                                                     disabled={idx === formFields.length - 1}
                                                     style={{ border: "none", background: "none", color: idx === formFields.length - 1 ? "var(--text-muted)" : "var(--accent-primary)", cursor: idx === formFields.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", padding: "4px" }}
                                                     onClick={() => moveFieldDown(idx)}
                                                 >
                                                     <ArrowDown size={16} />
                                                 </button>
                                                 <button
                                                     type="button"
                                                     style={{ border: "none", background: "none", color: "var(--accent-danger)", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px", borderRadius: "6px", transition: "background 0.2s" }}
                                                     onClick={() => removeFormField(idx)}
                                                     className="btn-delete-field"
                                                 >
                                                     <Trash size={16} />
                                                 </button>
                                             </div>
                                         </div>

                                         <div className="form-grid-3">
                                             <div className="form-group" style={{ marginBottom: 12 }}>
                                                 <label className="form-label text-xs">Field Label *</label>
                                                 <input
                                                     type="text"
                                                     className="form-input"
                                                     required
                                                     placeholder="e.g. Describe Symptoms"
                                                     value={field.label}
                                                     onChange={e => updateFormField(idx, "label", e.target.value)}
                                                 />
                                             </div>
                                             <div className="form-group" style={{ marginBottom: 12 }}>
                                                 <label className="form-label text-xs">Input Type *</label>
                                                 <select
                                                     className="form-input"
                                                     value={field.type}
                                                     style={{ cursor: "pointer" }}
                                                     onChange={e => updateFormField(idx, "type", e.target.value)}
                                                 >
                                                     <option value="text_input">Text Input (Single Line)</option>
                                                     <option value="textarea">Text Area (Multi Line)</option>
                                                     <option value="dropdown">Dropdown Select</option>
                                                     <option value="radio">Radio Options</option>
                                                     <option value="checkbox">Checkboxes (Multi-select)</option>
                                                     <option value="datetime">Date & Time Picker</option>
                                                     <option value="image_upload">Photo Upload Box</option>
                                                     <option value="number_input">Number Input</option>
                                                     <option value="phone_input">Phone Number Input</option>
                                                     <option value="file_upload">Document Upload (PDF)</option>
                                                     <option value="toggle">Toggle / Switch</option>
                                                     <option value="info_banner">Header / Info Banner</option>
                                                     <option value="benefits">Service Benefits List</option>
                                                     <option value="address_picker">Address Picker Box</option>
                                                     <option value="comments">Comments / Requirements Input</option>
                                                 </select>
                                             </div>
                                             <div className="form-group" style={{ marginBottom: 12 }}>
                                                 <label className="form-label text-xs">Placeholder / Subtitle</label>
                                                 <input
                                                     type="text"
                                                     className="form-input"
                                                     placeholder="e.g. Enter details..."
                                                     value={field.placeholder}
                                                     onChange={e => updateFormField(idx, "placeholder", e.target.value)}
                                                 />
                                             </div>
                                         </div>

                                         {["dropdown", "radio", "checkbox", "benefits"].includes(field.type) && (
                                             <div className="form-group" style={{ marginTop: 4, marginBottom: 12 }}>
                                                 <label className="form-label text-xs">Options List (Comma separated — format as &quot;Option: Price&quot; to set custom prices e.g. &quot;Short Visit (2 Hours): 499, Full Shift (8 Hours): 1299&quot;) *</label>
                                                 {isBloodTestService && (
                                                     <p className="text-xs" style={{ margin: "0 0 4px", color: "#2563EB" }}>
                                                         🩸 For blood tests, any prices typed here are ignored — the actual test/package price is pulled live from the Redcliffe Labs API at checkout.
                                                     </p>
                                                 )}
                                                 <input
                                                     type="text"
                                                     className="form-input"
                                                     required
                                                     placeholder='e.g. Short Visit (2 Hours): 499, Full Shift (8 Hours): 1299'
                                                     value={field.optionsString}
                                                     onChange={e => updateFormField(idx, "optionsString", e.target.value)}
                                                 />
                                             </div>
                                         )}

                                         <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 4 }}>
                                             <input
                                                 type="checkbox"
                                                 id={`req_${field.id || idx}`}
                                                 checked={field.required}
                                                 style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent-primary)" }}
                                                 onChange={e => updateFormField(idx, "required", e.target.checked)}
                                             />
                                             <label htmlFor={`req_${field.id || idx}`} className="text-xs cursor-pointer" style={{ margin: 0, fontWeight: "500", color: "var(--text-secondary)" }}>Required Field</label>
                                         </div>
                                     </div>
                                 ))
                             )}
                         </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            {editingService ? "Save Service" : "Publish Service"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
