"use client";
import { useState, useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon, Film, ExternalLink, Loader2 } from "lucide-react";
import { mediaAPI } from "@/lib/api";
import { showToast } from "@/lib/hooks";

function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
}

function fileKind(urlOrType) {
    const s = (urlOrType || "").toLowerCase();
    if (s.includes("image") || /\.(png|jpe?g|gif|webp)$/.test(s)) return "image";
    if (s.includes("video") || /\.(mp4)$/.test(s)) return "video";
    return "file";
}

const KIND_ICON = { image: ImageIcon, video: Film, file: FileText };

/**
 * Single-file upload widget: preview, name/type/size, replace, remove, and a
 * "Just updated" flash so a replaced file is visibly distinguishable from
 * the one it replaced. One component instead of five copy-pasted upload
 * handlers (Home Essentials/Diagnostic & Fitness/Tours & Travel/Server UI/
 * Website Settings each had their own — see MediaPage.jsx's grid for the
 * separate, already-fine library-browser case, which this doesn't replace).
 *
 * Props:
 *  - value: current file URL (string) or "" / null
 *  - onChange: (fileUrl: string) => void — called with the new URL after
 *      a successful upload, or "" after Remove
 *  - folder: GCS folder to upload into (passed to mediaAPI.upload)
 *  - fileName: optional display name if the URL alone isn't descriptive
 *  - accept: input accept attribute, default "image/*"
 */
export default function FileUploadField({ value, onChange, folder = "general", fileName, accept = "image/*" }) {
    const [uploading, setUploading] = useState(false);
    const [justUpdated, setJustUpdated] = useState(false);
    const inputRef = useRef(null);

    const displayName = fileName || (value ? value.split("/").pop().split("?")[0] : "");
    const kind = fileKind(value);
    const Icon = KIND_ICON[kind];

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        try {
            setUploading(true);
            const res = await mediaAPI.upload(formData);
            const fileUrl = res.data?.data?.fileUrl;
            if (!fileUrl) throw new Error("No file URL returned");
            onChange(fileUrl);
            setJustUpdated(true);
            setTimeout(() => setJustUpdated(false), 4000);
            showToast("File uploaded successfully", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Upload failed", "error");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {value ? (
                <div style={{
                    display: "flex", alignItems: "center", gap: 12, padding: 10,
                    border: justUpdated ? "1.5px solid var(--accent-primary, #10b981)" : "1px solid var(--border-color)",
                    borderRadius: 8,
                    backgroundColor: justUpdated ? "rgba(16,185,129,0.08)" : "var(--bg-muted)",
                    transition: "border-color 0.3s, background-color 0.3s",
                }}>
                    <div style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.15)" }}>
                        {kind === "image" ? (
                            <img src={value} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <Icon size={20} className="text-muted" />
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displayName}>
                            {displayName}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ textTransform: "uppercase" }}>{kind}</span>
                            {justUpdated && <span style={{ color: "var(--accent-primary, #10b981)", fontWeight: 600 }}>• Just updated</span>}
                        </div>
                    </div>
                    <a href={value} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ padding: 6 }} title="View full size">
                        <ExternalLink size={13} />
                    </a>
                    <button type="button" className="btn btn-sm btn-secondary" style={{ padding: 6 }} onClick={() => inputRef.current?.click()} disabled={uploading} title="Replace">
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" style={{ padding: 6 }} onClick={() => onChange("")} title="Remove">
                        <X size={13} />
                    </button>
                </div>
            ) : (
                <label className="btn btn-secondary" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, width: "fit-content" }}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? "Uploading..." : "Choose File"}
                </label>
            )}
            <input ref={inputRef} type="file" hidden accept={accept} onChange={handleFile} disabled={uploading} />
        </div>
    );
}
