"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { LogIn, Key, Mail, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loadingState, setLoadingState] = useState(false);

    const { login, isAuthenticated, loading, checkAuth } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!loading && isAuthenticated) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, loading, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoadingState(true);

        const res = await login(email, password);
        if (res.success) {
            router.push("/dashboard");
        } else {
            setError(res.message);
        }
        setLoadingState(false);
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-primary)" }}>
                <div style={{ width: 40, height: 40, border: "3px solid var(--border-color)", borderTopColor: "var(--accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

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
                                type={showPassword ? "text" : "password"}
                                required
                                className="form-input"
                                style={{ paddingLeft: 40, paddingRight: 40 }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ 
                                    position: "absolute", 
                                    right: 12, 
                                    top: "50%", 
                                    transform: "translateY(-50%)", 
                                    background: "none", 
                                    border: "none", 
                                    color: "var(--text-muted)", 
                                    cursor: "pointer",
                                    display: "flex",
                                    padding: 4,
                                    borderRadius: 4
                                }}
                                onMouseEnter={(e) => e.target.style.color = 'var(--accent-primary)'}
                                onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1.5rem", padding: "12px" }} disabled={loadingState}>
                        {loadingState ? "Signing in..." : <><LogIn size={18} /> Sign In</>}
                    </button>

                    <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                        <p className="text-muted text-sm">Super Admin: superadmin@oldful.com / admin123</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
