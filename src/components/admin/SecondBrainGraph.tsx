"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, Plus, Trash2 } from "lucide-react"

type NType = "root" | "products" | "insights" | "supplier" | "ai" | "note" | "data"

const COLOR: Record<NType, string> = {
  root:     "#dc2626",
  products: "#3b82f6",
  insights: "#10b981",
  supplier: "#f59e0b",
  ai:       "#8b5cf6",
  note:     "#f97316",
  data:     "#4b5563",
}

const ICON: Record<NType, string> = {
  root:     "⚡",
  products: "📦",
  insights: "📊",
  supplier: "🚚",
  ai:       "🤖",
  note:     "📝",
  data:     "◦",
}

interface GNode {
  id: string
  label: string
  sublabel?: string
  type: NType
  x: number
  y: number
  vx: number
  vy: number
  r: number
  fixed?: boolean
  connections: string[]
  noteId?: string
  noteContent?: string
}

interface Note { id: string; title: string; content: string }

interface Props {
  productTotal: number
  inStockCount: number
  outOfStockCount: number
  openContactCount: number
  customerCount: number
  initialNotes: Note[]
}

function at(cx: number, cy: number, angle: number, dist: number, jitter = 30) {
  return {
    x: cx + Math.cos(angle) * dist + (Math.random() - 0.5) * jitter,
    y: cy + Math.sin(angle) * dist + (Math.random() - 0.5) * jitter,
    vx: 0, vy: 0,
  }
}

function makeInitialNodes(
  productTotal: number, inStock: number, outOfStock: number,
  openContacts: number, customers: number,
  notes: Note[], cx: number, cy: number
): GNode[] {
  const base: GNode[] = [
    { id: "root",        label: "TurboTeknik",    type: "root",     x: cx, y: cy, vx: 0, vy: 0, r: 42, fixed: true, connections: ["products", "contacts", "customers", "supplier", "ai", "notes"] },
    { id: "products",    label: "Produkter",       sublabel: `${productTotal} totalt`,   type: "products", ...at(cx, cy, -0.7, 200), r: 30,  connections: ["root", "instock", "outstock"] },
    { id: "instock",     label: "I lager",         sublabel: `${inStock} st`,            type: "data",     ...at(cx, cy, -0.2, 340), r: 20,  connections: ["products"] },
    { id: "outstock",    label: "Slut",            sublabel: `${outOfStock} st`,         type: "data",     ...at(cx, cy, -1.2, 340), r: 20,  connections: ["products"] },
    { id: "contacts",    label: "Förfrågningar",   sublabel: `${openContacts} öppna`,    type: "insights", ...at(cx, cy,  0.7, 200), r: 28,  connections: ["root"] },
    { id: "customers",   label: "Kunder",          sublabel: `${customers} st`,          type: "insights", ...at(cx, cy,  1.4, 200), r: 24,  connections: ["root"] },
    { id: "supplier",    label: "Leverantörer",    type: "supplier",                                       ...at(cx, cy, Math.PI + 0.6, 200), r: 28, connections: ["root", "turbocentras"] },
    { id: "turbocentras",label: "Turbocentras",    sublabel: "API inkommande",           type: "data",     ...at(cx, cy, Math.PI + 0.15, 340), r: 22, connections: ["supplier"] },
    { id: "ai",          label: "AI Assistent",    sublabel: "Kommer snart",             type: "ai",       ...at(cx, cy, Math.PI - 0.6, 200), r: 28, connections: ["root"] },
    { id: "notes",       label: "Anteckningar",    sublabel: `${notes.length} noter`,   type: "note",     ...at(cx, cy, -Math.PI / 2, 200), r: 28, connections: ["root", ...notes.map(n => `note-${n.id}`)] },
  ]

  const noteNodes: GNode[] = notes.map((note, i) => {
    const angle = -Math.PI / 2 + (i - (notes.length - 1) / 2) * 0.5
    return {
      id: `note-${note.id}`,
      label: note.title.length > 14 ? note.title.slice(0, 14) + "…" : note.title,
      type: "note" as NType,
      ...at(cx, cy, angle, 360, 20),
      r: 18,
      connections: ["notes"],
      noteId: note.id,
      noteContent: note.content,
    }
  })

  return [...base, ...noteNodes]
}

export default function SecondBrainGraph({
  productTotal, inStockCount, outOfStockCount, openContactCount, customerCount, initialNotes
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const nodesRef     = useRef<GNode[]>([])
  const hoveredRef   = useRef<string | null>(null)
  const animRef      = useRef<number>(0)

  const [notes,   setNotes]   = useState<Note[]>(initialNotes)
  const [selected, setSelected] = useState<GNode | null>(null)
  const [mode,    setMode]    = useState<"view" | "edit" | "new">("view")
  const [form,    setForm]    = useState({ title: "", content: "" })
  const [saving,  setSaving]  = useState(false)

  // ── Init canvas + animation loop (mount only) ─────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1

    function resize() {
      const W = container!.clientWidth
      const H = container!.clientHeight
      canvas!.width  = W * dpr
      canvas!.height = H * dpr
      canvas!.style.width  = W + "px"
      canvas!.style.height = H + "px"
      const ctx = canvas!.getContext("2d")!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const W0 = container.clientWidth || 900
    const H0 = container.clientHeight || 580
    nodesRef.current = makeInitialNodes(
      productTotal, inStockCount, outOfStockCount,
      openContactCount, customerCount, initialNotes,
      W0 / 2, H0 / 2
    )

    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const hit = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r + 8)
      hoveredRef.current = hit?.id ?? null
      canvas.style.cursor = hit ? "pointer" : "default"
    }
    canvas.addEventListener("mousemove", onMouseMove)

    const ctx = canvas.getContext("2d")!
    const t0 = performance.now()

    function frame(now: number) {
      const t  = (now - t0) / 1000
      const W  = canvas!.width  / dpr
      const H  = canvas!.height / dpr
      const cx = W / 2, cy = H / 2
      const nodes = nodesRef.current

      // ── Physics ──────────────────────────────────────────
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        if (n.fixed) continue

        // Repulsion
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue
          const o = nodes[j]
          const dx = n.x - o.x, dy = n.y - o.y
          const d2 = Math.max(dx * dx + dy * dy, 0.01)
          const d  = Math.sqrt(d2)
          if (d < (n.r + o.r) * 4.5) {
            const f = 7500 / d2
            n.vx += (dx / d) * f
            n.vy += (dy / d) * f
          }
        }

        // Spring to connected nodes
        for (const cid of n.connections) {
          const o = nodes.find(x => x.id === cid)
          if (!o) continue
          const dx = o.x - n.x, dy = o.y - n.y
          const d  = Math.hypot(dx, dy) || 1
          const ideal = (n.type === "data" || (n.type === "note" && n.noteId)) ? 130 : 185
          const f = (d - ideal) * 0.022
          n.vx += (dx / d) * f
          n.vy += (dy / d) * f
        }

        // Center gravity
        n.vx += (cx - n.x) * 0.0007
        n.vy += (cy - n.y) * 0.0007

        // Damping + velocity cap
        n.vx = Math.max(-9, Math.min(9, n.vx * 0.86))
        n.vy = Math.max(-9, Math.min(9, n.vy * 0.86))
        n.x += n.vx
        n.y += n.vy

        // Boundary
        const pad = n.r + 55
        n.x = Math.max(pad, Math.min(W - pad, n.x))
        n.y = Math.max(pad, Math.min(H - pad, n.y))
      }

      // ── Draw ─────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H)

      // Dot grid
      ctx.fillStyle = "rgba(255,255,255,0.018)"
      for (let gx = 40; gx < W; gx += 40)
        for (let gy = 40; gy < H; gy += 40) {
          ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill()
        }

      // Edges
      const drawn = new Set<string>()
      for (const n of nodes) {
        for (const cid of n.connections) {
          const key = [n.id, cid].sort().join("|")
          if (drawn.has(key)) continue
          drawn.add(key)
          const o = nodes.find(x => x.id === cid)
          if (!o) continue
          const dx = o.x - n.x, dy = o.y - n.y

          ctx.beginPath()
          ctx.moveTo(n.x, n.y)
          ctx.lineTo(o.x, o.y)
          ctx.strokeStyle = "rgba(255,255,255,0.07)"
          ctx.lineWidth = 1
          ctx.stroke()

          // Traveling dots
          const dotColor = COLOR[n.type === "data" ? o.type : n.type]
          for (let k = 0; k < 2; k++) {
            const phase = (t * 0.32 + k * 0.5) % 1
            const alpha = Math.sin(phase * Math.PI) * 0.72
            if (alpha < 0.05) continue
            ctx.beginPath()
            ctx.arc(n.x + dx * phase, n.y + dy * phase, 2.5, 0, Math.PI * 2)
            ctx.fillStyle = dotColor + Math.round(alpha * 255).toString(16).padStart(2, "0")
            ctx.fill()
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        const color   = COLOR[n.type]
        const hovered = hoveredRef.current === n.id
        const pulse   = 1 + Math.sin(t * 1.2 + n.x * 0.005) * 0.028

        // Glow
        const gR = n.r * (hovered ? 3.6 : 2.8)
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, gR)
        glow.addColorStop(0, color + (hovered ? "44" : "28"))
        glow.addColorStop(1, "transparent")
        ctx.beginPath(); ctx.arc(n.x, n.y, gR, 0, Math.PI * 2)
        ctx.fillStyle = glow; ctx.fill()

        // Circle
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2)
        ctx.fillStyle = color + "cc"; ctx.fill()
        ctx.strokeStyle = hovered ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)"
        ctx.lineWidth = hovered ? 2 : 1.5; ctx.stroke()

        // Icon
        ctx.font = `${Math.max(12, n.r * 0.74)}px serif`
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillStyle = "#fff"
        ctx.fillText(ICON[n.type], n.x, n.y)

        // Label
        const lSize = Math.max(10, n.r * 0.42)
        ctx.font = `${n.fixed ? "700" : "600"} ${lSize}px system-ui, sans-serif`
        ctx.textAlign = "center"; ctx.textBaseline = "top"
        ctx.fillStyle = "#ffffffdd"
        ctx.fillText(n.label, n.x, n.y + n.r * pulse + 5)

        // Sublabel
        if (n.sublabel) {
          ctx.font = `${Math.max(9, n.r * 0.33)}px system-ui, sans-serif`
          ctx.fillStyle = "rgba(255,255,255,0.36)"
          ctx.fillText(n.sublabel, n.x, n.y + n.r * pulse + 6 + lSize)
        }
      }

      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animRef.current!)
      ro.disconnect()
      canvas.removeEventListener("mousemove", onMouseMove)
    }
  }, []) // mount only

  // ── Sync note nodes when notes list changes ───────────────
  useEffect(() => {
    if (nodesRef.current.length === 0) return

    const cluster = nodesRef.current.find(n => n.id === "notes")
    if (cluster) {
      cluster.sublabel = `${notes.length} noter`
      cluster.connections = ["root", ...notes.map(n => `note-${n.id}`)]
    }

    // Keep non-note nodes + note nodes that still exist
    const kept = nodesRef.current.filter(n => !n.noteId || notes.some(x => x.id === n.noteId))

    // Update label/content of existing note nodes
    const updated = kept.map(n => {
      if (!n.noteId) return n
      const note = notes.find(x => x.id === n.noteId)
      if (!note) return n
      return { ...n, label: note.title.length > 14 ? note.title.slice(0, 14) + "…" : note.title, noteContent: note.content }
    })

    // Add brand-new note nodes
    const existingNoteIds = new Set(updated.filter(n => n.noteId).map(n => n.noteId))
    const clusterNode = updated.find(n => n.id === "notes")
    const newNodes: GNode[] = notes
      .filter(n => !existingNoteIds.has(n.id))
      .map(note => {
        const angle = Math.random() * Math.PI * 2
        const dist  = 110 + Math.random() * 60
        return {
          id: `note-${note.id}`,
          label: note.title.length > 14 ? note.title.slice(0, 14) + "…" : note.title,
          type: "note" as NType,
          x: (clusterNode?.x ?? 400) + Math.cos(angle) * dist,
          y: (clusterNode?.y ?? 300) + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          r: 18, connections: ["notes"],
          noteId: note.id, noteContent: note.content,
        }
      })

    nodesRef.current = [...updated, ...newNodes]
  }, [notes])

  // ── Canvas click ─────────────────────────────────────────
  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const hit = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r + 8)
    if (hit) {
      setSelected(hit)
      setMode("view")
      if (hit.noteId) {
        const note = notes.find(n => n.id === hit.noteId)
        if (note) setForm({ title: note.title, content: note.content })
      }
    } else {
      setSelected(null)
      setMode("view")
    }
  }

  // ── CRUD ─────────────────────────────────────────────────
  const supabase = createClient()

  async function saveNote() {
    setSaving(true)
    try {
      if (mode === "new") {
        const { data, error } = await supabase
          .from("brain_notes")
          .insert({ title: form.title || "Ny anteckning", content: form.content })
          .select("id, title, content")
          .single()
        if (!error && data) {
          setNotes(prev => [...prev, data as Note])
          setMode("view"); setSelected(null); setForm({ title: "", content: "" })
        }
      } else if (mode === "edit" && selected?.noteId) {
        const { error } = await supabase
          .from("brain_notes")
          .update({ title: form.title || "Anteckning", content: form.content })
          .eq("id", selected.noteId)
        if (!error) {
          setNotes(prev => prev.map(n => n.id === selected.noteId ? { ...n, ...form } : n))
          setSelected(null); setMode("view")
        }
      }
    } finally { setSaving(false) }
  }

  async function deleteNote() {
    if (!selected?.noteId) return
    await supabase.from("brain_notes").delete().eq("id", selected.noteId)
    setNotes(prev => prev.filter(n => n.id !== selected.noteId))
    setSelected(null)
  }

  const panelOpen = selected !== null || mode === "new"

  const inp: React.CSSProperties = {
    background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8,
    padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none",
    width: "100%", boxSizing: "border-box",
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "72vh", minHeight: 500, borderRadius: 16, overflow: "hidden", background: "#050505", border: "1px solid #1a1a1a" }}>

      {/* Canvas */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
        <canvas ref={canvasRef} onClick={onCanvasClick} style={{ display: "block" }} />
      </div>

      {/* Add note FAB */}
      <button
        onClick={() => { setSelected(null); setMode("new"); setForm({ title: "", content: "" }) }}
        title="Ny anteckning"
        style={{
          position: "absolute", bottom: 20,
          right: panelOpen ? 336 : 20,
          width: 46, height: 46, borderRadius: "50%",
          background: "#f97316", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
          transition: "right 0.25s ease", zIndex: 10,
        }}
      >
        <Plus size={20} color="#fff" />
      </button>

      {/* Slide-in side panel */}
      {panelOpen && (
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 316,
          background: "#0f0f0f", borderLeft: "1px solid #1f1f1f",
          padding: 24, overflowY: "auto", zIndex: 10,
          animation: "sbSlide 0.2s ease",
        }}>
          <style>{`@keyframes sbSlide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`}</style>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <span style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {mode === "new" ? "Ny anteckning" : mode === "edit" ? "Redigera" : selected?.label ?? ""}
            </span>
            <button onClick={() => { setSelected(null); setMode("view") }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#444", padding: 4, display: "flex" }}>
              <X size={15} />
            </button>
          </div>

          {/* ── New note form ── */}
          {mode === "new" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titel..." style={inp} />
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Skriv dina tankar..." rows={7} style={{ ...inp, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveNote} disabled={saving} style={{ flex: 1, background: "#dc2626", border: "none", borderRadius: 8, padding: "10px 0", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Sparar…" : "Spara"}
                </button>
                <button onClick={() => setMode("view")} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", color: "#888", fontSize: 14, cursor: "pointer" }}>
                  Avbryt
                </button>
              </div>
            </div>
          )}

          {/* ── Edit note form ── */}
          {mode === "edit" && selected?.noteId && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} />
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={7} style={{ ...inp, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveNote} disabled={saving} style={{ flex: 1, background: "#dc2626", border: "none", borderRadius: 8, padding: "10px 0", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Sparar…" : "Spara"}
                </button>
                <button onClick={deleteNote} style={{ background: "#1a0000", border: "1px solid #3a0000", borderRadius: 8, padding: "10px 12px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── View mode ── */}
          {mode === "view" && selected && (
            <div>
              {/* Node icon */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: COLOR[selected.type], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {ICON[selected.type]}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{selected.label}</p>
                  {selected.sublabel && <p style={{ color: "#666", fontSize: 12, margin: "3px 0 0" }}>{selected.sublabel}</p>}
                </div>
              </div>

              {selected.id === "root" && <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>Ditt affärsnav. Alla noder är kopplade till TurboTeknik och representerar delar av din verksamhet.</p>}

              {selected.id === "products" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[["Totalt", productTotal, "#3b82f6"], ["I lager", inStockCount, "#10b981"], ["Slut på lager", outOfStockCount, "#dc2626"]].map(([label, val, col]) => (
                    <div key={label as string} style={{ background: "#111", borderRadius: 10, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#888", fontSize: 13 }}>{label}</span>
                      <span style={{ color: col as string, fontWeight: 700, fontSize: 16 }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {selected.id === "contacts" && (
                <div style={{ background: "#111", borderRadius: 10, padding: "13px 16px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#888", fontSize: 13 }}>Öppna förfrågningar</span>
                  <span style={{ color: "#10b981", fontWeight: 700, fontSize: 16 }}>{openContactCount}</span>
                </div>
              )}

              {selected.id === "customers" && (
                <div style={{ background: "#111", borderRadius: 10, padding: "13px 16px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#888", fontSize: 13 }}>Registrerade kunder</span>
                  <span style={{ color: "#10b981", fontWeight: 700, fontSize: 16 }}>{customerCount}</span>
                </div>
              )}

              {selected.id === "ai" && (
                <div style={{ background: "#1a1428", border: "1px solid #2d2050", borderRadius: 10, padding: 16 }}>
                  <p style={{ color: "#8b5cf6", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>🤖 AI Assistent</p>
                  <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>Din AI-assistent är på väg. Den kommer att svara på frågor om lagret, analysera trender och ge affärsinsikter direkt i grafen.</p>
                </div>
              )}

              {selected.id === "supplier" && <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>Dina leverantörer och API-kopplingar. Utöka grafen när fler leverantörer kopplas på.</p>}

              {selected.id === "turbocentras" && (
                <div style={{ background: "#1a1200", border: "1px solid #3d2e00", borderRadius: 10, padding: 16 }}>
                  <p style={{ color: "#f59e0b", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>🚚 Turbocentras</p>
                  <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>API-koppling inkommande. När du fått nyckeln synkas deras produktkatalog automatiskt till din databas.</p>
                </div>
              )}

              {selected.id === "instock" && <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>{inStockCount} produkter är tillgängliga och redo för leverans.</p>}
              {selected.id === "outstock" && <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>{outOfStockCount} produkter är för tillfället slut på lager.</p>}

              {selected.id === "notes" && (
                <div>
                  <p style={{ color: "#555", fontSize: 13, marginBottom: 16 }}>{notes.length} anteckningar sparade.</p>
                  <button
                    onClick={() => { setMode("new"); setForm({ title: "", content: "" }) }}
                    style={{ background: "#f97316", border: "none", borderRadius: 8, padding: "10px 0", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}
                  >
                    + Ny anteckning
                  </button>
                </div>
              )}

              {selected.noteId && (
                <div>
                  <p style={{ color: "#ccc", fontSize: 13, lineHeight: 1.75, marginBottom: 18, whiteSpace: "pre-wrap", minHeight: 60 }}>
                    {selected.noteContent || <span style={{ color: "#333" }}>Ingen text ännu.</span>}
                  </p>
                  <button
                    onClick={() => {
                      setMode("edit")
                      const note = notes.find(n => n.id === selected.noteId)
                      if (note) setForm({ title: note.title, content: note.content })
                    }}
                    style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 0", color: "#888", fontSize: 13, cursor: "pointer", width: "100%" }}
                  >
                    Redigera anteckning
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", gap: 14, flexWrap: "wrap", zIndex: 5, pointerEvents: "none" }}>
        {(["products", "insights", "supplier", "ai", "note"] as NType[]).map(type => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: COLOR[type] }} />
            <span style={{ fontSize: 10, color: "#444" }}>
              {type === "products" ? "Produkter" : type === "insights" ? "Insights" : type === "supplier" ? "Leverantör" : type === "ai" ? "AI" : "Anteckningar"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
