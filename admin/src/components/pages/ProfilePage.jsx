"use client";
import { useState, useEffect } from "react";
import { User, Mail, Shield, Save, Key, AlertCircle, CheckCircle } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import { adminAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

export default function ProfilePage() {
    const { user, setUser } = useAuthStore();
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const res = await adminAPI.update(user.id, formData);
            if (res.data.success) {
                // Update local storage/state if necessary
                // useAuthStore might need a way to update the user object
                setMessage({ type: "success", text: "Profile updated successfully!" });
                showToast("Profile updated successfully");
            }
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Failed to update profile" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h2>Account Settings</h2>
                <p>Manage your administrative profile and security</p>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <User size={20} className="text-accent" />
                            <h3>Personal Information</h3>
                        </div>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleUpdateProfile}>
                            {message.text && (
                                <div className={`badge ${message.type === 'success' ? 'badge-success' : 'badge-danger'}`} style={{ width: '100%', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    {message.text}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <div style={{ position: "relative" }}>
                                    <User size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ paddingLeft: 40 }}
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group mt-4">
                                <label className="form-label">Email Address</label>
                                <div style={{ position: "relative" }}>
                                    <Mail size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                    <input
                                        type="email"
                                        className="form-input"
                                        style={{ paddingLeft: 40 }}
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group mt-4">
                                <label className="form-label">Administrative Role</label>
                                <div style={{ position: "relative" }}>
                                    <Shield size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ paddingLeft: 40, opacity: 0.7, cursor: 'not-allowed' }}
                                        value={user?.role?.replace('_', ' ') || "Admin"}
                                        disabled
                                    />
                                </div>
                                <p className="text-xs text-muted mt-2">Roles cannot be changed manually for security reasons.</p>
                            </div>

                            <button type="submit" className="btn btn-primary mt-6" disabled={isLoading}>
                                <Save size={18} /> {isLoading ? "Saving..." : "Save Changes"}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Key size={20} className="text-accent" />
                            <h3>Security & Password</h3>
                        </div>
                    </div>
                    <div className="card-body">
                        <p className="text-sm text-muted mb-4">Ensure your account is using a long, random password to stay secure.</p>
                        
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input type="password" placeholder="••••••••" className="form-input" />
                        </div>
                        
                        <div className="form-group mt-4">
                            <label className="form-label">Confirm Password</label>
                            <input type="password" placeholder="••••••••" className="form-input" />
                        </div>

                        <button className="btn btn-secondary mt-6">
                            <Key size={18} /> Update Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
