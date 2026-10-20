"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import type { CatalogPart, CatalogTurbo, CatalogTurboPart } from "@/lib/catalog/search";

// The part types shown as their own columns, in the order a rebuild goes.
const MAIN_COLUMNS: { type: string; label: string }[] = [
  { type: "Cartridge",            label: "Patron" },
  { type: "Nozzle ring assembly", label: "Munstycksring" },
  { type: "Repair kit",           label: "Reparationssats" },
  { type: "Turbine housing",      label: "Turbinhus" },
  { type: "Compressor housing",   label: "Kompressorhus" },
  { type: "Actuator",             label: "Ställdon" },
];
const MAIN_TYPES = new Set(MAIN_COLUMNS.map(c => c.type));

const PART_TYPE_SV: Record<string, string> = {
  ...Object.fromEntries(MAIN_COLUMNS.map(c => [c.type, c.label])),
  "Bearing housing": "Lagerhus",
  "Shaft and wheel": "Axel och turbinhjul",
  "Compressor wheel": "Kompressorhjul",
  "Heat shield": "Värmesköld",
  "Compressor plate": "Kompressorplatta",
  "Gasket kit": "Packningssats",
  "VNT nozzle cage": "VNT-bur",
};
const typeLabel = (t: string | null) => (t ? PART_TYPE_SV[t] ?? t : "Del");

const linkCls = "text-[#0891b2] hover:text-red-600 hover:underline";

function PartRef({ part }: { part: Pick<CatalogTurboPart, "ref" | "pid"> }) {
  return part.pid
    ? <Link href={`/produkt/${part.pid}`} className={`${linkCls} font-mono`}>{part.ref}</Link>
    : <span className="font-mono text-gray-700">{part.ref}</span>;
}

function TurboRef({ reference, productId }: { reference: string | null; productId: string | null }) {
  const label = reference ?? "—";
  return productId
    ? <Link href={`/produkt/${productId}`} className={`${linkCls} font-mono font-semibold`}>{label}</Link>
    : <span className="font-mono font-semibold text-black">{label}</span>;
}

function partsOfType(t: CatalogTurbo, type: string) {
  return t.parts.filter(p => p.type === type);
}

function groupParts(parts: CatalogTurboPart[]) {
  const groups = new Map<string, CatalogTurboPart[]>();
  for (const p of parts) groups.set(p.type, [...(groups.get(p.type) ?? []), p]);
  return [...groups.entries()].sort(([a], [b]) => {
    const ia = MAIN_COLUMNS.findIndex(c => c.type === a), ib = MAIN_COLUMNS.findIndex(c => c.type === b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || typeLabel(a).localeCompare(typeLabel(b), "sv");
  });
}

// All numbers and every part of one turbo.
function TurboDetails({ turbo }: { turbo: CatalogTurbo }) {
  const groups = groupParts(turbo.parts);
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] text-sm">
      <div>
        <h4 className="text-xs font-semibold text-gray-500 mb-2">Nummer</h4>
        {turbo.numbers.length === 0 ? (
          <p className="text-gray-500">Inga andra nummer registrerade.</p>
        ) : (
          <ul className="space-y-0.5">
            {turbo.numbers.map((n, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-10 shrink-0 text-gray-400">{n.t}</span>
                <span className="font-mono text-black">{n.n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-500 mb-2">Alla delar ({turbo.parts.length})</h4>
        {groups.length === 0 ? (
          <p className="text-gray-500">Inga delar registrerade för den här turbon än.</p>
        ) : (
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            {groups.map(([type, parts]) => (
              <div key={type} className="flex gap-3 py-0.5">
                <dt className="w-40 shrink-0 text-gray-500">{typeLabel(type)}</dt>
                <dd className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {parts.map(p => <PartRef key={p.ref} part={p} />)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

function ToggleButton({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
      className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-300 text-gray-600 hover:border-red-500 hover:text-red-600 transition"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        {open ? <path d="M5 12h14" /> : <path d="M12 5v14M5 12h14" />}
      </svg>
    </button>
  );
}

export function TurboResults({ turbos, total }: { turbos: CatalogTurbo[]; total: number }) {
  const [openId, setOpenId] = useState<number | null>(turbos.length === 1 ? turbos[0].id : null);
  const toggle = (id: number) => setOpenId(o => (o === id ? null : id));

  return (
    <section aria-labelledby="turbo-results" className="mb-10">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 id="turbo-results" className="text-lg font-bold text-black">Turboladdare</h2>
        <p className="text-sm text-gray-500">
          {total > turbos.length ? `Visar ${turbos.length} av ${total.toLocaleString("sv-SE")}` : `${total} st`}
        </p>
      </div>

      {/* Desktop: one row per turbo, one column per main part */}
      <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-3 py-2.5 font-semibold w-10"><span className="sr-only">Detaljer</span></th>
              <th className="px-3 py-2.5 font-semibold">Serie</th>
              <th className="px-3 py-2.5 font-semibold">Modell</th>
              <th className="px-3 py-2.5 font-semibold">Turbo</th>
              {MAIN_COLUMNS.map(c => <th key={c.type} className="px-3 py-2.5 font-semibold">{c.label}</th>)}
              <th className="px-3 py-2.5 font-semibold">Övriga delar</th>
            </tr>
          </thead>
          <tbody>
            {turbos.map(t => {
              const open = openId === t.id;
              const others = t.parts.filter(p => !MAIN_TYPES.has(p.type)).length;
              return (
                <Fragment key={t.id}>
                  <tr className={`border-t border-gray-100 align-top ${open ? "bg-red-50/40" : "hover:bg-gray-50"}`}>
                    <td className="px-3 py-2">
                      <ToggleButton open={open} onClick={() => toggle(t.id)} label={`${open ? "Dölj" : "Visa"} alla nummer och delar för ${t.reference ?? "turbon"}`} />
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">{t.series ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-700">{t.model ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <TurboRef reference={t.reference} productId={t.product_id} />
                      {t.brand && <div className="text-xs text-gray-400">{t.brand}</div>}
                    </td>
                    {MAIN_COLUMNS.map(c => {
                      const ps = partsOfType(t, c.type);
                      return (
                        <td key={c.type} className="px-3 py-2.5 whitespace-nowrap">
                          {ps.length ? (
                            <div className="flex flex-col gap-0.5">{ps.map(p => <PartRef key={p.ref} part={p} />)}</div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {others > 0 ? (
                        <button type="button" onClick={() => toggle(t.id)} className={`${linkCls} text-sm`}>{others} st</button>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-red-50/40">
                      <td />
                      <td colSpan={MAIN_COLUMNS.length + 4} className="px-3 pb-5 pt-1">
                        <TurboDetails turbo={t} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per turbo */}
      <ul className="md:hidden space-y-3">
        {turbos.map(t => {
          const open = openId === t.id;
          const main = MAIN_COLUMNS.map(c => ({ ...c, parts: partsOfType(t, c.type) })).filter(c => c.parts.length);
          return (
            <li key={t.id} className="border border-gray-200 rounded-lg bg-white">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <TurboRef reference={t.reference} productId={t.product_id} />
                    <p className="text-xs text-gray-500 mt-0.5">{[t.brand, t.series, t.model].filter(Boolean).join(" · ")}</p>
                  </div>
                  <ToggleButton open={open} onClick={() => toggle(t.id)} label={`${open ? "Dölj" : "Visa"} alla nummer och delar för ${t.reference ?? "turbon"}`} />
                </div>
                {main.length > 0 ? (
                  <dl className="mt-3 space-y-1 text-sm">
                    {main.map(c => (
                      <div key={c.type} className="flex gap-3">
                        <dt className="w-32 shrink-0 text-gray-500">{c.label}</dt>
                        <dd className="flex flex-wrap gap-x-3">{c.parts.map(p => <PartRef key={p.ref} part={p} />)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">Inga huvuddelar registrerade.</p>
                )}
              </div>
              {open && (
                <div className="border-t border-gray-100 p-4 bg-red-50/40">
                  <TurboDetails turbo={t} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const TURBOS_SHOWN = 12;

function FitsTurbos({ part }: { part: CatalogPart }) {
  const [all, setAll] = useState(false);
  const shown = all ? part.turbos : part.turbos.slice(0, TURBOS_SHOWN);
  const hidden = part.turboCount - shown.length;
  if (part.turboCount === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
      {shown.map(t => (
        <Link key={t.id} href={`/katalog/sok?s=${encodeURIComponent(t.reference ?? "")}`} className={`${linkCls} font-mono`}
          title={[t.brand, t.model].filter(Boolean).join(" ")}>
          {t.reference}
        </Link>
      ))}
      {hidden > 0 && (
        !all && part.turbos.length > shown.length ? (
          <button type="button" onClick={() => setAll(true)} className="text-gray-500 hover:text-red-600 underline">
            visa fler
          </button>
        ) : (
          <span className="text-gray-500">och {hidden.toLocaleString("sv-SE")} till</span>
        )
      )}
    </div>
  );
}

export function PartResults({ parts, total }: { parts: CatalogPart[]; total: number }) {
  return (
    <section aria-labelledby="part-results" className="mb-10">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 id="part-results" className="text-lg font-bold text-black">Reservdelar</h2>
        <p className="text-sm text-gray-500">
          {total > parts.length ? `Visar ${parts.length} av ${total.toLocaleString("sv-SE")}` : `${total} st`}
        </p>
      </div>

      <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-3 py-2.5 font-semibold">Typ</th>
              <th className="px-3 py-2.5 font-semibold">Artikelnummer</th>
              <th className="px-3 py-2.5 font-semibold">Märke</th>
              <th className="px-3 py-2.5 font-semibold">Alternativa nummer</th>
              <th className="px-3 py-2.5 font-semibold">Passar turboladdare</th>
            </tr>
          </thead>
          <tbody>
            {parts.map(p => (
              <tr key={p.id} className="border-t border-gray-100 align-top hover:bg-gray-50">
                <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{typeLabel(p.type)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap font-semibold"><PartRef part={{ ref: p.reference, pid: p.product_id }} /></td>
                <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{p.brand ?? "—"}</td>
                <td className="px-3 py-2.5 text-gray-700">
                  {p.numbers.length ? p.numbers.map(n => n.n).join(", ") : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2.5 min-w-[280px]">
                  <p className="text-xs text-gray-500 mb-1">{p.turboCount.toLocaleString("sv-SE")} st</p>
                  <FitsTurbos part={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden space-y-3">
        {parts.map(p => (
          <li key={p.id} className="border border-gray-200 rounded-lg bg-white p-4 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold"><PartRef part={{ ref: p.reference, pid: p.product_id }} /></span>
              <span className="text-gray-500">{typeLabel(p.type)}</span>
            </div>
            {p.numbers.length > 0 && (
              <p className="mt-1 text-gray-600">Även: {p.numbers.map(n => n.n).join(", ")}</p>
            )}
            <p className="mt-3 text-xs text-gray-500">Passar {p.turboCount.toLocaleString("sv-SE")} turboladdare</p>
            <div className="mt-1"><FitsTurbos part={p} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
