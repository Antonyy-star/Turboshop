// Line drawing of a turbo compressor wheel seen from the front: full blades,
// shorter splitter blades between them, hub and shaft nut. Decorative only.
export default function CompressorWheel({ className }: { className?: string }) {
  const blades = 7;
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden="true" focusable="false">
      <circle r="97" fill="none" stroke="#3f3f46" strokeWidth="0.6" />
      <circle r="92" fill="none" stroke="#27272a" strokeWidth="0.6" />
      {Array.from({ length: blades }).map((_, i) => {
        const angle = (360 / blades) * i;
        return (
          <g key={i} transform={`rotate(${angle})`}>
            {/* Full blade, sweeping against the direction of rotation */}
            <path d="M 4 -20 C 20 -40, 34 -62, 24 -90" fill="none" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M -3 -20 C 12 -42, 24 -64, 13 -91" fill="none" stroke="#dc2626" strokeWidth="0.7" strokeOpacity="0.55" strokeLinecap="round" />
            {/* Splitter blade, starts further out */}
            <g transform={`rotate(${180 / blades})`}>
              <path d="M 10 -46 C 20 -60, 28 -74, 20 -90" fill="none" stroke="#a1a1aa" strokeWidth="1" strokeLinecap="round" />
            </g>
          </g>
        );
      })}
      <circle r="20" fill="#000" stroke="#a1a1aa" strokeWidth="1.2" />
      <polygon
        points={Array.from({ length: 6 }).map((_, i) => {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          return `${(9 * Math.cos(a)).toFixed(2)},${(9 * Math.sin(a)).toFixed(2)}`;
        }).join(" ")}
        fill="none"
        stroke="#dc2626"
        strokeWidth="1.2"
      />
      <circle r="3.2" fill="#dc2626" />
    </svg>
  );
}
