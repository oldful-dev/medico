"use client";
import { useState } from "react";
import { DollarSign, Save, RefreshCw } from "lucide-react";

const pricingCategories = [
    {
        category: "Booking Fees",
        items: [
            { id: 1, name: "Doctor Home Visit", currentPrice: "₹799", minPrice: "₹499", maxPrice: "₹1,499" },
            { id: 2, name: "Blood Test", currentPrice: "₹299", minPrice: "₹199", maxPrice: "₹599" },
            { id: 3, name: "Home Nurse (per day)", currentPrice: "₹1,299", minPrice: "₹899", maxPrice: "₹2,499" },
            { id: 4, name: "Hospital Trip", currentPrice: "₹499", minPrice: "₹299", maxPrice: "₹999" },
            { id: 5, name: "Physio Session", currentPrice: "₹699", minPrice: "₹399", maxPrice: "₹1,299" },
        ]
    },
    {
        category: "Service Fees",
        items: [
            { id: 6, name: "Platform Fee", currentPrice: "₹49", minPrice: "₹0", maxPrice: "₹99" },
            { id: 7, name: "Priority Booking Fee", currentPrice: "₹99", minPrice: "₹49", maxPrice: "₹199" },
            { id: 8, name: "Emergency Surcharge", currentPrice: "₹199", minPrice: "₹99", maxPrice: "₹499" },
        ]
    },
    {
        category: "Add-ons",
        items: [
            { id: 9, name: "Dedicated Care Manager", currentPrice: "₹999/mo", minPrice: "₹499", maxPrice: "₹1,999" },
            { id: 10, name: "Extra Family Member", currentPrice: "₹499/mo", minPrice: "₹299", maxPrice: "₹999" },
            { id: 11, name: "Report Digitization", currentPrice: "₹149", minPrice: "₹99", maxPrice: "₹299" },
        ]
    },
    {
        category: "Special Services",
        items: [
            { id: 12, name: "Tech Helper Visit", currentPrice: "₹399", minPrice: "₹249", maxPrice: "₹699" },
            { id: 13, name: "Travel Event Ticket", currentPrice: "₹199", minPrice: "₹99", maxPrice: "₹499" },
            { id: 14, name: "Tiffin (per meal)", currentPrice: "₹149", minPrice: "₹99", maxPrice: "₹249" },
            { id: 15, name: "Equipment Rent (per day)", currentPrice: "₹99", minPrice: "₹49", maxPrice: "₹299" },
        ]
    },
];

export default function PricingPage() {
    const [hasChanges, setHasChanges] = useState(false);

    return (
        <div>
            <div className="page-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h2>Pricing Engine</h2>
                        <p>Dynamic pricing control — changes reflect without app update</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary"><RefreshCw size={16} /> Reset All</button>
                        <button className={`btn ${hasChanges ? "btn-primary" : "btn-secondary"}`} disabled={!hasChanges}>
                            <Save size={16} /> Publish Changes
                        </button>
                    </div>
                </div>
            </div>

            {pricingCategories.map((cat, ci) => (
                <div key={ci} className="card mb-6">
                    <div className="card-header">
                        <h3>{cat.category}</h3>
                        <span className="badge badge-info">{cat.items.length} items</span>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>Service</th><th>Current Price</th><th>New Price</th><th>Min</th><th>Max</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {cat.items.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{item.name}</td>
                                        <td><span className="badge badge-info">{item.currentPrice}</span></td>
                                        <td>
                                            <input
                                                className="form-input"
                                                defaultValue={item.currentPrice}
                                                style={{ width: 120, padding: "6px 10px", fontSize: 13 }}
                                                onChange={() => setHasChanges(true)}
                                            />
                                        </td>
                                        <td className="text-sm text-muted">{item.minPrice}</td>
                                        <td className="text-sm text-muted">{item.maxPrice}</td>
                                        <td><span className="badge badge-success">Live</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}
