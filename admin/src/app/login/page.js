"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { LogIn, Key, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const login = useAuthStore((state) => state.login);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const res = await login(email, password);
        if (res.success) {
            router.push("/dashboard");
        } else {
            setError(res.message);
        }
        setLoading(false);
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-primary)" }}>
            <div className="card" style={{ width: 400, maxWidth: "90%", padding: "2rem" }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{ width: 48, height: 48, background: "var(--gradient-primary)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                        <span style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>O</span>
                    </div>
                    <h2>Oldful Admin</h2>
                    <p className="text-muted text-sm mt-1">Sign in to manage operations</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{ background: "rgba(255, 59, 48, 0.1)", color: "var(--accent-danger)", padding: "10px 12px", borderRadius: "8px", marginBottom: "1rem", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div style={{ position: "relative" }}>
                            <Mail size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                            <input
                                type="email"
                                required
                                className="form-input"
                                style={{ paddingLeft: 40 }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@oldful.com"
                            />
                        </div>
                    </div>

                    <div className="form-group mt-4">
                        <label className="form-label">Password</label>
                        <div style={{ position: "relative" }}>
                            <Key size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                            <input
                                type="password"
                                required
                                className="form-input"
                                style={{ paddingLeft: 40 }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1.5rem", padding: "12px" }} disabled={loading}>
                        {loading ? "Signing in..." : <><LogIn size={18} /> Sign In</>}
                    </button>

                    <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                        <p className="text-muted text-sm">Super Admin: superadmin@oldful.com / admin123</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
