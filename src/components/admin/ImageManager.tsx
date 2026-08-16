"use client";

import { useRef, useCallback, useState } from "react";
import { X, Upload, Link as LinkIcon, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

export default function ImageManager({ images, onChange }: Props) {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [urlInput, setUrlInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      onChange([...images, data.publicUrl]);
    } catch (e: any) {
      alert("Uppladdning misslyckades: " + (e?.message ?? "okänt fel"));
    }
    setUploading(false);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) uploadFile(file);
  }, [images]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { uploadFile(file); e.target.value = ""; }
  };

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    onChange([...images, url]);
    setUrlInput("");
  }

  function removeImage(idx: number) {
    onChange(images.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 10 }}>
        Produktbilder {images.length > 0 && <span style={{ color: "#555" }}>({images.length} {images.length === 1 ? "bild" : "bilder"})</span>}
      </label>

      {/* Current images grid */}
      {images.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {images.map((img, idx) => (
            <div key={idx} style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 80, height: 80, background: "#1a1a1a", borderRadius: 8, overflow: "hidden", border: idx === 0 ? "2px solid #dc2626" : "2px solid #2a2a2a" }}>
                <img
                  src={img}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              {idx === 0 && (
                <span style={{ position: "absolute", bottom: 3, left: 3, background: "#dc2626", color: "#fff", fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3 }}>HUVUD</span>
              )}
              <button
                onClick={() => removeImage(idx)}
                style={{ position: "absolute", top: -5, right: -5, background: "#333", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={10} color="#fff" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: "flex", background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 3, gap: 3, marginBottom: 10, width: "fit-content" }}>
        {(["url", "upload"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ background: mode === m ? "#dc2626" : "transparent", color: mode === m ? "#fff" : "#666", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
            {m === "url" ? <><LinkIcon size={12} /> Bild-URL</> : <><Upload size={12} /> Ladda upp</>}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addUrl()}
            placeholder="https://exempel.com/bild.jpg"
            style={{ flex: 1, background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
          <button
            onClick={addUrl}
            style={{ background: "#1f1f1f", border: "1px solid #333", borderRadius: 8, padding: "9px 14px", color: "#ccc", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            + Lägg till
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? "#dc2626" : "#333"}`, borderRadius: 10, padding: "20px", textAlign: "center", cursor: uploading ? "wait" : "pointer", background: dragging ? "#1a0000" : "#0a0a0a", transition: "all 0.15s" }}
        >
          {uploading ? (
            <p style={{ color: "#aaa", fontSize: 13 }}>Laddar upp...</p>
          ) : (
            <>
              <Upload size={22} color={dragging ? "#dc2626" : "#444"} style={{ margin: "0 auto 8px" }} />
              <p style={{ color: "#aaa", fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: "#dc2626", fontWeight: 600 }}>Klicka</span> eller dra och släpp
              </p>
              <p style={{ color: "#555", fontSize: 11 }}>PNG, JPG, WEBP — max 10 MB</p>
            </>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        </div>
      )}

      {images.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <ImageIcon size={13} color="#555" />
          <p style={{ fontSize: 11, color: "#555" }}>Lägg till minst en bild. Den första bilden används som huvudbild.</p>
        </div>
      )}
    </div>
  );
}
