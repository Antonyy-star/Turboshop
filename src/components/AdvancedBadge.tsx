export default function AdvancedBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        backgroundColor: "#F5C518",
        color: "#1A1A1A",
        fontWeight: 700,
        fontSize: "10px",
        fontFamily: "inherit",
        padding: "3px 5px",
        borderRadius: "4px",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <svg
        aria-hidden="true"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1A1A1A"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
      Avancerat
    </span>
  );
}
