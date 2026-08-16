"use client";

const BLADE = "M38.5 37.5 L28 8 Q40 2 52 8 L41.5 37.5 Q40 40 38.5 37.5Z";
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export default function LogoIcon({ size = 82 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <style>{`
        @keyframes tt-spin { to { transform: rotate(360deg); } }
        .tt-blades {
          transform-box: fill-box;
          transform-origin: center;
          animation: tt-spin 3s linear infinite;
        }
      `}</style>

      {/* Background disc */}
      <circle cx="40" cy="40" r="39" fill="#111111" />

      {/* Spinning blade group */}
      <g className="tt-blades">
        {ANGLES.map((a) => (
          <path
            key={a}
            d={BLADE}
            fill="#cc0000"
            fillOpacity={0.95}
            transform={`rotate(${a} 40 40)`}
          />
        ))}
      </g>

      {/* Center hub — sits on top, not spinning */}
      <circle cx="40" cy="40" r="15" fill="#111111" />
      <circle cx="40" cy="40" r="10" fill="#0f0f0f" stroke="#cc0000" strokeWidth="2" />
      <circle cx="40" cy="40" r="4" fill="#cc0000" />

      {/* Outer ring */}
      <circle cx="40" cy="40" r="38.5" fill="none" stroke="#cc0000" strokeWidth="1.5" />
    </svg>
  );
}
