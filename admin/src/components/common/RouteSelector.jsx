"use client";
import React, { useState, useEffect } from "react";
import { serviceAPI } from "@/lib/api";

export const PRESET_SYSTEM_ROUTES = [
  { label: "All Ayuxa Services", value: "/all-ayuxa-services" },
  { label: "All Home Essentials", value: "/all-home-essentials" },
  { label: "Doctor Home Visit", value: "/doctor-visit" },
  { label: "Nurse & Aide Care", value: "/nurse-care" },
  { label: "Caregiver Support", value: "/caregiver-support" },
  { label: "Blood Test / Lab Work", value: "/blood-test" },
  { label: "Scan & ECG", value: "/scan-ecg" },
  { label: "Order Medicines", value: "/order-medicines" },
  { label: "Physio Therapy", value: "/physio" },
  { label: "Fitness & Wellness", value: "/fitness" },
  { label: "Medical Equipment", value: "/medical-equipment" },
  { label: "Meal & Tiffin Service", value: "/meal-service" },
  { label: "Hospital Trip & Visit", value: "/hospital-trip" },
  // Home Essentials services all render through one shared dynamic screen
  // now — there's no dedicated route file per service any more, so a NEW
  // Home Essentials service should get /home-essentials-dynamic/<its-slug>
  // (set automatically from the slug field), not a preset from this list.
  // These are kept only so existing links/deep-links referencing the old
  // paths still show a readable label here; don't pick these for a new
  // service.
  { label: "Appliance Repair (legacy path)", value: "/appliance-repair" },
  { label: "Plumbing & Electrical (legacy path)", value: "/plumbing-electrical" },
  { label: "Deep Cleaning (legacy path)", value: "/deep-cleaning" },
  { label: "Driver & Cab (legacy path)", value: "/driving-cab" },
  { label: "Bill Payment (legacy path)", value: "/bill-payment" },
  { label: "Bank & Paperwork (legacy path)", value: "/bank-paperwork" },
  { label: "Grocery Run (legacy path)", value: "/grocery-run" },
  { label: "Paper & Legal Helper (legacy path)", value: "/paper-legal" },
  { label: "Anything Else Request (legacy path)", value: "/anything-else" },
  { label: "Washroom Sanitation (legacy path)", value: "/sanitisation" },
  { label: "Tech Helper (legacy path)", value: "/tech-helper" },
  { label: "Trip & Travels", value: "/trip-travels" },
  { label: "Local Meetups", value: "/meetup" },
  { label: "Insurance", value: "/insurance" },
  { label: "Transportation", value: "/transportation" },
  { label: "Smart Membership Upgrade", value: "/smart-upgrade" },
  { label: "Cart / Checkout", value: "/cart" },
  { label: "My Bookings History", value: "/my-bookings" },
  { label: "Medical Logs", value: "/profile/medical-logs" },
  { label: "Medical Card", value: "/profile/medical-card" },
  { label: "Emergency SOS", value: "/sos-emergency" },
];

const mapServicesToRoutes = (services) =>
  (services || []).map(s => ({
    label: `${s.name}`,
    value: s.route || (s.slug === 'home-essentials' ? '/all-home-essentials' : `/${s.slug}`),
  }));

// `services`: when a page already renders many RouteSelectors at once (e.g.
// Server UI, one per service item across every section), pass its own
// already-fetched service list here instead of leaving each instance to
// independently call GET /api/services on mount — with a dozen+ items that
// was a dozen+ duplicate calls firing in the same second.
export default function RouteSelector({ value, onChange, placeholder = "Select or type route...", className = "", compact = false, services = null }) {
  const [fetchedRoutes, setFetchedRoutes] = useState([]);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    // When the caller passes its own already-fetched `services`, skip the
    // self-fetch entirely — derived below instead of stored in state.
    if (services) return;
    // Fetched once on mount, so a service added/deleted elsewhere after this
    // dropdown first mounted wouldn't show up until the whole page reloaded
    // — refetch on window focus too (e.g. after switching back from Home
    // Essentials / Diagnostic & Fitness where the change was made).
    const loadRoutes = () => {
      serviceAPI.getAll()
        .then(res => {
          if (res.data?.data) {
            setFetchedRoutes(mapServicesToRoutes(res.data.data));
          }
        })
        .catch(() => {});
    };
    loadRoutes();
    window.addEventListener("focus", loadRoutes);
    return () => window.removeEventListener("focus", loadRoutes);
  }, [services]);

  const dbRoutes = services ? mapServicesToRoutes(services) : fetchedRoutes;

  // Merge PRESET and DB routes without duplicates
  const allOptions = [...PRESET_SYSTEM_ROUTES];
  dbRoutes.forEach(dbItem => {
    if (!allOptions.some(opt => opt.value === dbItem.value)) {
      allOptions.push(dbItem);
    }
  });

  const isMatched = allOptions.some(opt => opt.value === value);

  if (compact) {
    return (
      <div style={{ display: "flex", gap: 4, width: "100%" }}>
        {!isCustom ? (
          <select
            value={isMatched ? value : (value ? "__CUSTOM__" : "")}
            onChange={(e) => {
              if (e.target.value === "__CUSTOM__") {
                setIsCustom(true);
              } else {
                onChange(e.target.value);
              }
            }}
            className={className || "form-input"}
            style={{ height: 28, fontSize: 11, padding: "2px 6px", flex: 1, minWidth: 0 }}
          >
            <option value="">-- Select Route --</option>
            {allOptions.map((opt, i) => (
              <option key={`${opt.value}-${i}`} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
            <option value="__CUSTOM__">✏️ Custom Route...</option>
          </select>
        ) : (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={className || "form-input"}
            style={{ height: 28, fontSize: 11, padding: "2px 6px", flex: 1, minWidth: 0 }}
          />
        )}
        <button
          type="button"
          onClick={() => setIsCustom(!isCustom)}
          style={{
            padding: "0 4px",
            height: 28,
            fontSize: 10,
            borderRadius: 4,
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-muted)",
            color: "var(--text-color)",
            cursor: "pointer",
            flexShrink: 0
          }}
          title="Toggle Dropdown / Manual Mode"
        >
          {isCustom ? "List" : "Type"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        {!isCustom ? (
          <select
            value={isMatched ? value : (value ? "__CUSTOM__" : "")}
            onChange={(e) => {
              if (e.target.value === "__CUSTOM__") {
                setIsCustom(true);
              } else {
                onChange(e.target.value);
              }
            }}
            className={className || "form-input"}
            style={{ cursor: "pointer", flex: 1 }}
          >
            <option value="">-- Select Available Route --</option>
            {allOptions.map((opt, i) => (
              <option key={`${opt.value}-${i}`} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
            <option value="__CUSTOM__">✏️ Custom Route (Type manually)</option>
          </select>
        ) : (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={className || "form-input"}
            style={{ flex: 1 }}
          />
        )}
        <button
          type="button"
          onClick={() => setIsCustom(!isCustom)}
          className="btn btn-secondary"
          style={{ padding: "0 10px", height: 38, fontSize: 12, flexShrink: 0 }}
          title="Toggle Dropdown / Manual Input"
        >
          {isCustom ? "Select List" : "Manual Type"}
        </button>
      </div>
      {value && (
        <span style={{ fontSize: 11, color: "var(--accent-primary)", fontFamily: "monospace" }}>
          Selected: <strong>{value}</strong>
        </span>
      )}
    </div>
  );
}
