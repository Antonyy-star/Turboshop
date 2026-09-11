"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, Plus, Trash2, RotateCcw } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────
type NType = "root" | "products" | "insights" | "supplier" | "ai" | "note" | "data" | "activity"
type NoteCategory = "note" | "goal" | "task" | "idea" | "link"

interface GNode {
  id: string; label: string; sublabel?: string; type: NType
  x: number; y: number; vx: number; vy: number; r: number
  fixed?: boolean; connections: string[]
  noteId?: string; noteContent?: string; noteCategory?: NoteCategory; noteColor?: string
}

interface Note { id: string; title: string; content: string; color: string; node_category: string }
interface NoteForm { title: string; content: string; color: string; category: NoteCategory }

interface Props {
  productTotal: number; inStockCount: number; outOfStockCount: number
  openContactCount: number; handledContactCount: number; customerCount: number
  categoryCounts: Record<string, number>
  topBrands: Array<{ brand: string; count: number }>
  todayActivityCount: number; lastActivityAction: string | null; lastStockCheck: string | null
  initialNotes: Note[]
}

// ── Constants ──────────────────────────────────────────────────────
const COLOR: Record<NType, string> = {
  root: "#dc2626", products: "#3b82f6", insights: "#10b981",
  supplier: "#f59e0b", ai: "#8b5cf6", note: "#f97316", data: "#4b5563", activity: "#06b6d4",
}
const ICON: Record<NType, string> = {
  root: "⚡", products: "📦", insights: "📊", supplier: "🚚",
  ai: "🤖", note: "📝", data: "◦", activity: "📋",
}
const NOTE_COLORS: Record<NoteCategory, string> = {
  note: "#f97316", goal: "#dc2626", task: "#10b981", idea: "#f59e0b", link: "#3b82f6",
}
const NOTE_ICONS: Record<NoteCategory, string> = {
  note: "📝", goal: "🎯", task: "✅", idea: "💡", link: "🔗",
}
const NOTE_LABELS: Record<NoteCategory, string> = {
  note: "Anteckning", goal: "Mål", task: "Uppgift", idea: "Idé", link: "Länk",
}
const COLOR_PRESETS = ["#f97316", "#dc2626", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"]

// ── localStorage helpers ───────────────────────────────────────────
const POS_KEY = "tt_brain_pos"
const CUSTOM_KEY = "tt_brain_custom"

function getPositions(): Record<string, { x: number; y: number }> {
  if (typeof window === "undefined") return {}
  try { return JSON.parse(localStorage.getItem(POS_KEY) || "{}") } catch { return {} }
}
function savePos(id: string, x: number, y: number) {
  const p = getPositions(); p[id] = { x, y }; localStorage.setItem(POS_KEY, JSON.stringify(p))
}
function clearAllPos() { if (typeof window !== "undefined") localStorage.removeItem(POS_KEY) }
function clearOnePos(id: string) {
  const p = getPositions(); delete p[id]; localStorage.setItem(POS_KEY, JSON.stringify(p))
}

type Customs = Record<string, { label?: string; color?: string }>
function getCustoms(): Customs {
  if (typeof window === "undefined") return {}
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "{}") } catch { return {} }
}
function setCustomEntry(id: string, data: { label?: string; color?: string }) {
  const c = getCustoms(); c[id] = { ...c[id], ...data }; localStorage.setItem(CUSTOM_KEY, JSON.stringify(c))
}

// ── Build graph ────────────────────────────────────────────────────
function buildGraph(
  p: Props & { notes: Note[] },
  cx: number, cy: number
): GNode[] {
  const {
    productTotal, inStockCount, outOfStockCount, openContactCount, handledContactCount,
    customerCount, categoryCounts, topBrands, todayActivityCount, lastStockCheck, notes,
  } = p

  const j = () => (Math.random() - 0.5) * 28
  const at = (angle: number, dist: number) => ({
    x: cx + Math.cos(angle) * dist + j(),
    y: cy + Math.sin(angle) * dist + j(),
    vx: 0, vy: 0,
  })

  const catEntries = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a).slice(0, 4)
  const brandEntries = topBrands.slice(0, 4)
  const hasBrands = brandEntries.length > 0
  const hasStock = lastStockCheck != null

  const nodes: GNode[] = [
    { id: "root", label: "TurboTeknik", type: "root", x: cx, y: cy, vx: 0, vy: 0, r: 42, fixed: true,
      connections: ["products", "contacts", "customers", "activity", "supplier", "ai", "notes"] },

    { id: "products", label: "Produkter", sublabel: `${productTotal} totalt`, type: "products",
      ...at(-0.7, 200), r: 30,
      connections: ["root", "instock", "outstock", ...catEntries.map(([c]) => `cat-${c}`), ...(hasBrands ? ["brands"] : [])] },
    { id: "instock",  label: "I lager", sublabel: `${inStockCount} st`,    type: "data", ...at(-0.2,  345), r: 20, connections: ["products"] },
    { id: "outstock", label: "Slut",    sublabel: `${outOfStockCount} st`, type: "data", ...at(-1.15, 345), r: 20, connections: ["products"] },

    ...catEntries.map(([cat, count], i): GNode => ({
      id: `cat-${cat}`,
      label: cat.length > 11 ? cat.slice(0, 11) + "…" : cat,
      sublabel: `${count} st`,
      type: "data", ...at(-0.55 + i * 0.27, 445), r: 18, connections: ["products"],
    })),

    ...(hasBrands ? [
      { id: "brands", label: "Varumärken", type: "supplier" as NType,
        ...at(-0.05, 365), r: 22,
        connections: ["products", ...brandEntries.map(b => `brand-${b.brand}`)] } as GNode,
      ...brandEntries.map((b, i): GNode => ({
        id: `brand-${b.brand}`,
        label: b.brand.length > 10 ? b.brand.slice(0, 10) + "…" : b.brand,
        sublabel: `${b.count} st`,
        type: "data", ...at(0.08 + i * 0.22, 492), r: 16, connections: ["brands"],
      })),
    ] : []),

    { id: "contacts", label: "Förfrågningar", sublabel: `${openContactCount} öppna`, type: "insights",
      ...at(0.7, 200), r: 28, connections: ["root", "contacts-handled"] },
    { id: "contacts-handled", label: "Hanterade", sublabel: `${handledContactCount} st`, type: "data",
      ...at(1.0, 340), r: 18, connections: ["contacts"] },

    { id: "customers", label: "Kunder", sublabel: `${customerCount} st`, type: "insights",
      ...at(1.42, 200), r: 24, connections: ["root"] },

    { id: "activity", label: "Aktivitet", sublabel: `${todayActivityCount} idag`, type: "activity",
      ...at(Math.PI, 200), r: 26, connections: ["root", ...(hasStock ? ["stockcheck"] : [])] },

    ...(hasStock ? [{
      id: "stockcheck", label: "Lagercheck",
      sublabel: new Date(lastStockCheck!).toLocaleDateString("sv-SE"),
      type: "data" as NType, ...at(Math.PI - 0.35, 340), r: 18, connections: ["activity"],
    } as GNode] : []),

    { id: "supplier", label: "Leverantörer", type: "supplier",
      ...at(Math.PI + 0.65, 200), r: 26, connections: ["root", "turbocentras"] },
    { id: "turbocentras", label: "Turbocentras", sublabel: "API inkommande", type: "data",
      ...at(Math.PI + 0.38, 340), r: 20, connections: ["supplier"] },

    { id: "ai", label: "AI Assistent", sublabel: "Kommer snart", type: "ai",
      ...at(Math.PI - 0.72, 200), r: 28, connections: ["root"] },

    { id: "notes", label: "Anteckningar", sublabel: `${notes.length} noter`, type: "note",
      ...at(-Math.PI / 2, 200), r: 28,
      connections: ["root", ...notes.map(n => `note-${n.id}`)] },

    ...notes.map((note, i): GNode => ({
      id: `note-${note.id}`,
      label: note.title.length > 13 ? note.title.slice(0, 13) + "…" : note.title,
      type: "note",
      ...at(-Math.PI / 2 + (i - (notes.length - 1) / 2) * 0.44, 368),
      r: 18, connections: ["notes"],
      noteId: note.id, noteContent: note.content,
      noteCategory: (note.node_category as NoteCategory) || "note",
      noteColor: note.color || "#f97316",
    })),
  ]

  const saved = getPositions()
  return nodes.map(n => (!n.fixed && saved[n.id]) ? { ...n, x: saved[n.id].x, y: saved[n.id].y } : n)
}

// ── Component ──────────────────────────────────────────────────────
export default function SecondBrainGraph(props: Props) {
  const {
    productTotal, inStockCount, outOfStockCount, openContactCount, handledContactCount,
    customerCount, todayActivityCount, lastActivityAction, lastStockCheck, topBrands,
    initialNotes,
  } = props

  const containerRef    = useRef<HTMLDivElement>(null)
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const nodesRef        = useRef<GNode[]>([])
  const hoveredRef      = useRef<string | null>(null)
  const animRef         = useRef<number>(0)
  const customsRef      = useRef<Customs>({})
  const justDraggedRef  = useRef<boolean>(false)

  const [notes,       setNotes]       = useState<Note[]>(initialNotes)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [mode,        setMode]        = useState<"view" | "edit" | "new">("view")
  const [form,        setForm]        = useState<NoteForm>({ title: "", content: "", color: "#f97316", category: "note" })
  const [nodeLabel,   setNodeLabel]   = useState("")
  const [nodeColor,   setNodeColor]   = useState("")
  const [saving,      setSaving]      = useState(false)
  const [ctxMenu,     setCtxMenu]     = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [, forceUpdate] = useState(0)

  const supabase = useMemo(() => createClient(), [])

  const selectedNode = selectedId ? (nodesRef.current.find(n => n.id === selectedId) ?? null) : null
  const noteData     = selectedNode?.noteId ? notes.find(n => n.id === selectedNode.noteId) : null

  // ── Canvas init + animation ──────────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    customsRef.current = getCustoms()

    const dpr = window.devicePixelRatio || 1

    function resize() {
      const W = container!.clientWidth, H = container!.clientHeight
      canvas!.width  = W * dpr; canvas!.height = H * dpr
      canvas!.style.width  = W + "px"; canvas!.style.height = H + "px"
      canvas!.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const W0 = container.clientWidth || 900, H0 = container.clientHeight || 580
    nodesRef.current = buildGraph({ ...props, notes: initialNotes }, W0 / 2, H0 / 2)

    const ro = new ResizeObserver(resize)
    ro.observe(container)

    // ── Drag ──────────────────────────────────────────────────────
    let dragging: GNode | null = null
    let dragStartX = 0, dragStartY = 0, dragMoved = false

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const hit = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r + 8)
      if (hit && !hit.fixed) {
        dragging = hit; dragStartX = mx; dragStartY = my; dragMoved = false
      }
    }
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      if (dragging) {
        if (Math.hypot(mx - dragStartX, my - dragStartY) > 5) {
          dragMoved = true
          dragging.x = mx; dragging.y = my; dragging.vx = 0; dragging.vy = 0
          canvas.style.cursor = "grabbing"
        }
      } else {
        const hit = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r + 8)
        hoveredRef.current = hit?.id ?? null
        canvas.style.cursor = hit ? "grab" : "default"
      }
    }
    const onMouseUp = () => {
      if (dragging && dragMoved) {
        savePos(dragging.id, dragging.x, dragging.y)
        justDraggedRef.current = true
      }
      dragging = null; dragMoved = false
      canvas.style.cursor = hoveredRef.current ? "grab" : "default"
    }
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const hit = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r + 8)
      if (hit && hit.id !== "root") setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: hit.id })
    }

    canvas.addEventListener("mousedown",    onMouseDown)
    canvas.addEventListener("mousemove",    onMouseMove)
    canvas.addEventListener("mouseup",      onMouseUp)
    canvas.addEventListener("contextmenu",  onContextMenu)

    // ── Animation loop ────────────────────────────────────────────
    const ctx = canvas.getContext("2d")!
    const t0  = performance.now()

    function frame(now: number) {
      const t  = (now - t0) / 1000
      const W  = canvas!.width / dpr, H = canvas!.height / dpr
      const cx = W / 2, cy = H / 2
      const nodes   = nodesRef.current
      const customs = customsRef.current

      // Physics
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        if (n.fixed) continue
        for (let j2 = 0; j2 < nodes.length; j2++) {
          if (i === j2) continue
          const o = nodes[j2]
          const dx = n.x - o.x, dy = n.y - o.y
          const d2 = Math.max(dx * dx + dy * dy, 0.01)
          if (Math.sqrt(d2) < (n.r + o.r) * 4.5) {
            const f = 7500 / d2; const d = Math.sqrt(d2)
            n.vx += (dx / d) * f; n.vy += (dy / d) * f
          }
        }
        for (const cid of n.connections) {
          const o = nodes.find(x => x.id === cid)
          if (!o) continue
          const dx = o.x - n.x, dy = o.y - n.y
          const d  = Math.hypot(dx, dy) || 1
          const ideal = (n.type === "data" || n.noteId) ? 130 : 185
          const f = (d - ideal) * 0.022
          n.vx += (dx / d) * f; n.vy += (dy / d) * f
        }
        n.vx += (cx - n.x) * 0.0007; n.vy += (cy - n.y) * 0.0007
        n.vx = Math.max(-9, Math.min(9, n.vx * 0.86))
        n.vy = Math.max(-9, Math.min(9, n.vy * 0.86))
        n.x += n.vx; n.y += n.vy
        const pad = n.r + 55
        n.x = Math.max(pad, Math.min(W - pad, n.x))
        n.y = Math.max(pad, Math.min(H - pad, n.y))
      }

      // Draw
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
          if (drawn.has(key)) continue; drawn.add(key)
          const o = nodes.find(x => x.id === cid)
          if (!o) continue
          const dx = o.x - n.x, dy = o.y - n.y
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(o.x, o.y)
          ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1; ctx.stroke()
          const dc = COLOR[n.type === "data" ? o.type : n.type]
          for (let k = 0; k < 2; k++) {
            const phase = (t * 0.32 + k * 0.5) % 1
            const alpha = Math.sin(phase * Math.PI) * 0.72
            if (alpha < 0.05) continue
            ctx.beginPath()
            ctx.arc(n.x + dx * phase, n.y + dy * phase, 2.5, 0, Math.PI * 2)
            ctx.fillStyle = dc + Math.round(alpha * 255).toString(16).padStart(2, "0"); ctx.fill()
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        const color   = customs[n.id]?.color ?? (n.noteId ? (n.noteColor ?? "#f97316") : COLOR[n.type])
        const label   = customs[n.id]?.label ?? n.label
        const icon    = n.noteId ? (NOTE_ICONS[n.noteCategory ?? "note"] ?? "📝") : ICON[n.type]
        const hovered = hoveredRef.current === n.id
        const pulse   = 1 + Math.sin(t * 1.2 + n.x * 0.005) * 0.028

        const gR = n.r * (hovered ? 3.6 : 2.8)
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, gR)
        glow.addColorStop(0, color + (hovered ? "44" : "28")); glow.addColorStop(1, "transparent")
        ctx.beginPath(); ctx.arc(n.x, n.y, gR, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill()

        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2)
        ctx.fillStyle = color + "cc"; ctx.fill()
        ctx.strokeStyle = hovered ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)"
        ctx.lineWidth = hovered ? 2 : 1.5; ctx.stroke()

        ctx.font = `${Math.max(12, n.r * 0.74)}px serif`
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"
        ctx.fillText(icon, n.x, n.y)

        const lSize = Math.max(10, n.r * 0.42)
        ctx.font = `${n.fixed ? "700" : "600"} ${lSize}px system-ui, sans-serif`
        ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = "#ffffffdd"
        ctx.fillText(label, n.x, n.y + n.r * pulse + 5)

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
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
      canvas.removeEventListener("mousedown",   onMouseDown)
      canvas.removeEventListener("mousemove",   onMouseMove)
      canvas.removeEventListener("mouseup",     onMouseUp)
      canvas.removeEventListener("contextmenu", onContextMenu)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync note nodes when notes state changes ─────────────────────
  useEffect(() => {
    if (nodesRef.current.length === 0) return
    const cluster = nodesRef.current.find(n => n.id === "notes")
    if (cluster) {
      cluster.sublabel    = `${notes.length} noter`
      cluster.connections = ["root", ...notes.map(n => `note-${n.id}`)]
    }

    const kept    = nodesRef.current.filter(n => !n.noteId || notes.some(x => x.id === n.noteId))
    const updated = kept.map(n => {
      if (!n.noteId) return n
      const note = notes.find(x => x.id === n.noteId)
      if (!note) return n
      return {
        ...n,
        label:        note.title.length > 13 ? note.title.slice(0, 13) + "…" : note.title,
        noteContent:  note.content,
        noteCategory: (note.node_category as NoteCategory) || "note",
        noteColor:    note.color || "#f97316",
      }
    })

    const existing = new Set(updated.filter(n => n.noteId).map(n => n.noteId))
    const anchor   = updated.find(n => n.id === "notes")
    const fresh: GNode[] = notes.filter(n => !existing.has(n.id)).map((note): GNode => ({
      id: `note-${note.id}`,
      label: note.title.length > 13 ? note.title.slice(0, 13) + "…" : note.title,
      type: "note",
      x: (anchor?.x ?? 400) + Math.cos(Math.random() * Math.PI * 2) * 115,
      y: (anchor?.y ?? 300) + Math.sin(Math.random() * Math.PI * 2) * 115,
      vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
      r: 18, connections: ["notes"],
      noteId: note.id, noteContent: note.content,
      noteCategory: (note.node_category as NoteCategory) || "note",
      noteColor: note.color || "#f97316",
    }))

    nodesRef.current = [...updated, ...fresh]
  }, [notes])

  // ── Realtime subscription ────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel("brain-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "brain_notes" }, (payload: any) => {
        if (payload.eventType === "INSERT")
          setNotes(prev => [payload.new as Note, ...prev])
        else if (payload.eventType === "UPDATE")
          setNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new as Note : n))
        else if (payload.eventType === "DELETE")
          setNotes(prev => prev.filter(n => n.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  // ── Context menu dismiss on outside click ────────────────────────
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [ctxMenu])

  // ── Canvas click ─────────────────────────────────────────────────
  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    setCtxMenu(null)
    if (justDraggedRef.current) { justDraggedRef.current = false; return }
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const hit = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r + 8)
    if (hit) {
      setSelectedId(hit.id); setMode("view")
      const c = customsRef.current[hit.id]
      setNodeLabel(c?.label ?? hit.label)
      setNodeColor(c?.color ?? "")
    } else {
      setSelectedId(null); setMode("view")
    }
  }

  // ── Reset layout ─────────────────────────────────────────────────
  function resetLayout() {
    clearAllPos()
    const W = containerRef.current?.clientWidth || 900
    const H = containerRef.current?.clientHeight || 580
    nodesRef.current = buildGraph({ ...props, notes }, W / 2, H / 2)
  }

  // ── Node customization ────────────────────────────────────────────
  function saveNodeCustomization() {
    if (!selectedId) return
    const data: { label?: string; color?: string } = {}
    if (nodeLabel.trim()) data.label = nodeLabel.trim()
    if (nodeColor) data.color = nodeColor
    setCustomEntry(selectedId, data)
    customsRef.current = getCustoms()
    forceUpdate(n => n + 1)
  }

  // ── Context menu actions ──────────────────────────────────────────
  function ctxEdit() {
    if (!ctxMenu) return
    const node = nodesRef.current.find(n => n.id === ctxMenu.nodeId)
    if (!node) return
    setSelectedId(node.id); setMode("view")
    const c = customsRef.current[node.id]
    setNodeLabel(c?.label ?? node.label); setNodeColor(c?.color ?? "")
    setCtxMenu(null)
  }
  function ctxResetPos() {
    if (!ctxMenu) return
    clearOnePos(ctxMenu.nodeId)
    setCtxMenu(null)
  }
  function ctxDelete() {
    if (!ctxMenu) return
    const node = nodesRef.current.find(n => n.id === ctxMenu.nodeId)
    if (!node?.noteId) return
    const nid = node.noteId
    supabase.from("brain_notes").delete().eq("id", nid).then(() => {
      setNotes(prev => prev.filter(n => n.id !== nid))
      if (selectedId === node.id) setSelectedId(null)
    })
    setCtxMenu(null)
  }

  // ── Note CRUD ─────────────────────────────────────────────────────
  async function saveNote() {
    setSaving(true)
    try {
      if (mode === "new") {
        const { data, error } = await supabase
          .from("brain_notes")
          .insert({ title: form.title || "Ny anteckning", content: form.content, color: form.color, node_category: form.category })
          .select("id, title, content, color, node_category").single()
        if (!error && data) {
          setNotes(prev => [data as Note, ...prev])
          setMode("view"); setSelectedId(null)
          setForm({ title: "", content: "", color: "#f97316", category: "note" })
        }
      } else if (mode === "edit" && selectedNode?.noteId) {
        const nid = selectedNode.noteId
        const { error } = await supabase
          .from("brain_notes")
          .update({ title: form.title || "Anteckning", content: form.content, color: form.color, node_category: form.category })
          .eq("id", nid)
        if (!error) {
          setNotes(prev => prev.map(n => n.id === nid
            ? { ...n, title: form.title, content: form.content, color: form.color, node_category: form.category }
            : n))
          setMode("view")
        }
      }
    } finally { setSaving(false) }
  }

  async function deleteNote() {
    if (!selectedNode?.noteId) return
    const nid = selectedNode.noteId
    await supabase.from("brain_notes").delete().eq("id", nid)
    setNotes(prev => prev.filter(n => n.id !== nid))
    setSelectedId(null); setMode("view")
  }

  const panelOpen = selectedId !== null || mode === "new"

  const inp: React.CSSProperties = {
    background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8,
    padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none",
    width: "100%", boxSizing: "border-box",
  }
  const actionBtn = (bg: string): React.CSSProperties => ({
    background: bg, border: "none", borderRadius: 8, padding: "10px 0",
    color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", flex: 1,
  })

  // node effective color (for panel icon)
  const selColor = selectedNode
    ? (customsRef.current[selectedNode.id]?.color ?? (selectedNode.noteId ? selectedNode.noteColor : COLOR[selectedNode.type]) ?? COLOR[selectedNode.type])
    : "#4b5563"

  function CategoryRow() {
    return (
      <div>
        <p style={{ color: "#555", fontSize: 11, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>Typ</p>
        <div style={{ display: "flex", gap: 6 }}>
          {(["note", "goal", "task", "idea", "link"] as NoteCategory[]).map(cat => (
            <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat, color: NOTE_COLORS[cat] }))}
              title={NOTE_LABELS[cat]}
              style={{ width: 36, height: 36, borderRadius: 8, fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                border: `1.5px solid ${form.category === cat ? NOTE_COLORS[cat] : "#2a2a2a"}`,
                background: form.category === cat ? NOTE_COLORS[cat] + "22" : "#1a1a1a",
              }}>
              {NOTE_ICONS[cat]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function ColorRow({ value, onChange }: { value: string; onChange: (c: string) => void }) {
    return (
      <div>
        <p style={{ color: "#555", fontSize: 11, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>Färg</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {COLOR_PRESETS.map(c => (
            <button key={c} onClick={() => onChange(c)}
              style={{ width: 22, height: 22, borderRadius: "50%", background: c, padding: 0, cursor: "pointer",
                border: value === c ? "2px solid #fff" : "2px solid transparent" }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "76vh", minHeight: 540, borderRadius: 16, overflow: "hidden", background: "#050505", border: "1px solid #1a1a1a" }}>
      <style>{`@keyframes sbSlide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* Canvas */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
        <canvas ref={canvasRef} onClick={onCanvasClick} style={{ display: "block" }} />
      </div>

      {/* Toolbar */}
      <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 7, zIndex: 10 }}>
        <button onClick={resetLayout} title="Återställ layout"
          style={{ background: "#111", border: "1px solid #222", borderRadius: 8, padding: "6px 10px", color: "#555", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <RotateCcw size={11} /> Återställ
        </button>
      </div>

      {/* Add note FAB */}
      <button
        onClick={() => { setSelectedId(null); setMode("new"); setForm({ title: "", content: "", color: "#f97316", category: "note" }) }}
        title="Ny anteckning"
        style={{
          position: "absolute", bottom: 20, right: panelOpen ? 336 : 20,
          width: 46, height: 46, borderRadius: "50%",
          background: "#f97316", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
          transition: "right 0.25s ease", zIndex: 10,
        }}>
        <Plus size={20} color="#fff" />
      </button>

      {/* Context menu */}
      {ctxMenu && (
        <div onClick={e => e.stopPropagation()}
          style={{ position: "fixed", top: ctxMenu.y, left: ctxMenu.x, background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: "4px 0", zIndex: 300, minWidth: 178, boxShadow: "0 8px 30px rgba(0,0,0,0.7)" }}>
          {[
            { label: "Redigera / Anpassa", action: ctxEdit },
            { label: "Återställ position",  action: ctxResetPos },
            ...(nodesRef.current.find(n => n.id === ctxMenu.nodeId)?.noteId
              ? [{ label: "Ta bort anteckning", action: ctxDelete, danger: true }] as Array<{ label: string; action: () => void; danger?: boolean }>
              : []),
          ].map(item => (
            <button key={item.label} onClick={item.action}
              style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "9px 16px", cursor: "pointer", fontSize: 13, color: item.danger ? "#f87171" : "#ccc", fontFamily: "system-ui, sans-serif" }}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Side panel */}
      {panelOpen && (
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 316, background: "#0f0f0f", borderLeft: "1px solid #1f1f1f", padding: 24, overflowY: "auto", zIndex: 10, animation: "sbSlide 0.2s ease" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <span style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {mode === "new" ? "Ny anteckning" : mode === "edit" ? "Redigera" : (selectedNode ? (customsRef.current[selectedNode.id]?.label ?? selectedNode.label) : "")}
            </span>
            <button onClick={() => { setSelectedId(null); setMode("view") }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#444", padding: 4, display: "flex" }}>
              <X size={15} />
            </button>
          </div>

          {/* ── New note ── */}
          {mode === "new" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <CategoryRow />
              <ColorRow value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titel..." style={inp} />
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Skriv dina tankar..." rows={6} style={{ ...inp, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveNote} disabled={saving} style={{ ...actionBtn("#dc2626"), opacity: saving ? 0.6 : 1 }}>{saving ? "Sparar…" : "Spara"}</button>
                <button onClick={() => setMode("view")} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", color: "#888", fontSize: 14, cursor: "pointer" }}>Avbryt</button>
              </div>
            </div>
          )}

          {/* ── Edit note ── */}
          {mode === "edit" && selectedNode?.noteId && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <CategoryRow />
              <ColorRow value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} />
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} style={{ ...inp, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveNote} disabled={saving} style={{ ...actionBtn("#dc2626"), opacity: saving ? 0.6 : 1 }}>{saving ? "Sparar…" : "Spara"}</button>
                <button onClick={deleteNote} style={{ background: "#1a0000", border: "1px solid #3a0000", borderRadius: 8, padding: "10px 12px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── View node ── */}
          {mode === "view" && selectedNode && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: selColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {selectedNode.noteId ? (NOTE_ICONS[selectedNode.noteCategory ?? "note"] ?? "📝") : ICON[selectedNode.type]}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{customsRef.current[selectedNode.id]?.label ?? selectedNode.label}</p>
                  {selectedNode.sublabel && <p style={{ color: "#666", fontSize: 12, margin: "3px 0 0" }}>{selectedNode.sublabel}</p>}
                </div>
              </div>

              {/* Per-node panels */}
              {selectedNode.id === "root" && (
                <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>Ditt affärsnav. Alla noder representerar delar av din verksamhet på TurboTeknik.</p>
              )}

              {selectedNode.id === "products" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {([["Totalt", productTotal, "#3b82f6"], ["I lager", inStockCount, "#10b981"], ["Slut", outOfStockCount, "#dc2626"]] as [string, number, string][]).map(([l, v, c]) => (
                    <div key={l} style={{ background: "#111", borderRadius: 10, padding: "13px 16px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888", fontSize: 13 }}>{l}</span>
                      <span style={{ color: c, fontWeight: 700, fontSize: 16 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedNode.id === "contacts" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {([["Öppna", openContactCount, "#10b981"], ["Hanterade", handledContactCount, "#4b5563"]] as [string, number, string][]).map(([l, v, c]) => (
                    <div key={l} style={{ background: "#111", borderRadius: 10, padding: "13px 16px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888", fontSize: 13 }}>{l}</span>
                      <span style={{ color: c, fontWeight: 700, fontSize: 16 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedNode.id === "customers" && (
                <div style={{ background: "#111", borderRadius: 10, padding: "13px 16px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#888", fontSize: 13 }}>Registrerade kunder</span>
                  <span style={{ color: "#10b981", fontWeight: 700, fontSize: 16 }}>{customerCount}</span>
                </div>
              )}

              {selectedNode.id === "activity" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ background: "#111", borderRadius: 10, padding: "13px 16px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888", fontSize: 13 }}>Ändringar idag</span>
                    <span style={{ color: "#06b6d4", fontWeight: 700, fontSize: 16 }}>{todayActivityCount}</span>
                  </div>
                  {lastActivityAction && (
                    <div style={{ background: "#0c1a1c", border: "1px solid #1a3840", borderRadius: 10, padding: "12px 14px" }}>
                      <p style={{ color: "#06b6d4", fontSize: 11, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Senaste ändring</p>
                      <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>{lastActivityAction}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.id === "stockcheck" && (
                <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>
                  Senaste lagerkontroll: {lastStockCheck ? new Date(lastStockCheck).toLocaleDateString("sv-SE", { dateStyle: "long" }) : "—"}
                </p>
              )}

              {selectedNode.id === "brands" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {topBrands.map(b => (
                    <div key={b.brand} style={{ background: "#111", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888", fontSize: 13 }}>{b.brand}</span>
                      <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 13 }}>{b.count} st</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedNode.id === "ai" && (
                <div style={{ background: "#1a1428", border: "1px solid #2d2050", borderRadius: 10, padding: 16 }}>
                  <p style={{ color: "#8b5cf6", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>🤖 AI Assistent</p>
                  <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>Din AI-assistent är på väg. Den kommer analysera lagertrender och ge affärsinsikter direkt i grafen.</p>
                </div>
              )}

              {selectedNode.id === "turbocentras" && (
                <div style={{ background: "#1a1200", border: "1px solid #3d2e00", borderRadius: 10, padding: 16 }}>
                  <p style={{ color: "#f59e0b", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>🚚 Turbocentras</p>
                  <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>API-koppling inkommande. När du fått nyckeln synkas produktkatalogen automatiskt till din databas.</p>
                </div>
              )}

              {selectedNode.id === "supplier" && (
                <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>Dina leverantörer och kommande API-kopplingar.</p>
              )}

              {selectedNode.id === "notes" && (
                <div>
                  <p style={{ color: "#555", fontSize: 13, marginBottom: 16 }}>{notes.length} anteckningar sparade.</p>
                  <button onClick={() => { setMode("new"); setForm({ title: "", content: "", color: "#f97316", category: "note" }) }}
                    style={{ ...actionBtn("#f97316"), display: "block", width: "100%", textAlign: "center" }}>
                    + Ny anteckning
                  </button>
                </div>
              )}

              {selectedNode.noteId && (
                <div>
                  <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>{NOTE_ICONS[noteData?.node_category as NoteCategory ?? "note"]}</span>
                    <span style={{ color: "#555", fontSize: 12 }}>{NOTE_LABELS[noteData?.node_category as NoteCategory ?? "note"]}</span>
                  </div>
                  <div style={{ background: "#111", borderRadius: 10, padding: 14, marginBottom: 14, minHeight: 80 }}>
                    <p style={{ color: noteData?.content ? "#ccc" : "#333", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>
                      {noteData?.content || "Ingen text ännu."}
                    </p>
                  </div>
                  <button onClick={() => {
                    if (noteData) setForm({ title: noteData.title, content: noteData.content, color: noteData.color || "#f97316", category: (noteData.node_category as NoteCategory) || "note" })
                    setMode("edit")
                  }}
                    style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 0", color: "#888", fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center" }}>
                    Redigera anteckning
                  </button>
                </div>
              )}

              {/* Customization section for non-root, non-note-cluster, non-individual-note nodes */}
              {selectedNode.id !== "root" && selectedNode.id !== "notes" && !selectedNode.noteId && (
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid #1a1a1a" }}>
                  <p style={{ color: "#333", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Anpassa nod</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input value={nodeLabel} onChange={e => setNodeLabel(e.target.value)} placeholder="Anpassat namn..." style={{ ...inp, fontSize: 13 }} />
                    <div>
                      <p style={{ color: "#444", fontSize: 11, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>Färg</p>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                        <button onClick={() => setNodeColor("")} title="Standard"
                          style={{ width: 22, height: 22, borderRadius: "50%", background: "#222", border: nodeColor === "" ? "2px solid #fff" : "2px solid #444", cursor: "pointer", fontSize: 10, color: "#888", padding: 0 }}>
                          ×
                        </button>
                        {COLOR_PRESETS.map(c => (
                          <button key={c} onClick={() => setNodeColor(c)}
                            style={{ width: 22, height: 22, borderRadius: "50%", background: c, padding: 0, cursor: "pointer", border: nodeColor === c ? "2px solid #fff" : "2px solid transparent" }} />
                        ))}
                      </div>
                    </div>
                    <button onClick={saveNodeCustomization}
                      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 0", color: "#aaa", fontSize: 13, cursor: "pointer" }}>
                      Spara anpassning
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ position: "absolute", bottom: 14, left: 14, display: "flex", gap: 12, flexWrap: "wrap", zIndex: 5, pointerEvents: "none" }}>
        {(["products", "insights", "activity", "supplier", "ai", "note"] as NType[]).map(type => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLOR[type] }} />
            <span style={{ fontSize: 10, color: "#383838" }}>
              {type === "products" ? "Produkter" : type === "insights" ? "Kontakter/Kunder" : type === "activity" ? "Aktivitet" : type === "supplier" ? "Leverantör" : type === "ai" ? "AI" : "Anteckningar"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
