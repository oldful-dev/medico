"use client";
import { Download, Users, Activity, TrendingUp } from "lucide-react";

const METRICS = [
    { icon: Download, color: "purple", label: "Total App Installations" },
    { icon: Users, color: "green", label: "Active Users" },
    { icon: Activity, color: "blue", label: "Live App Usage Data" },
    { icon: TrendingUp, color: "yellow", label: "User Activity & Engagement Statistics" },
];

export default function AppUsersPage() {
    return (
        <div>
            <div className="page-header"><h2>App Users & Installation</h2><p>Install counts, active users, and engagement stats</p></div>

            <div className="stats-grid">
                {METRICS.map((m) => {
                    const Icon = m.icon;
                    return (
                        <div className="stat-card" key={m.label}>
                            <div className="stat-card-header">
                                <div className={`stat-card-icon ${m.color}`}><Icon size={22} /></div>
                            </div>
                            <div className="stat-card-value text-muted" style={{ fontSize: 14, fontWeight: 600 }}>Coming Soon</div>
                            <div className="stat-card-label">{m.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="card" style={{ marginTop: 16 }}>
                <div className="empty-state">
                    <Download />
                    <h4>Awaiting Store API Credentials</h4>
                    <p>
                        These metrics will populate once Google Play Console and Apple App Store Connect
                        API credentials are available and wired in.
                    </p>
                </div>
            </div>
        </div>
    );
}
