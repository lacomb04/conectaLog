import React, { useState } from "react";

export default function ChatDock({ buttons = [] }) {
  const [open, setOpen] = useState(true);
  const safeButtons = buttons.filter(Boolean);

  const handleButtonClick = (onClick) => () => {
    setOpen(true);
    onClick?.();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        zIndex: 1400,
        display: "flex",
        alignItems: "flex-end",
        gap: 12,
      }}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "12px 18px",
          border: "none",
          borderRadius: 999,
          background: "#111827",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 18px 36px rgba(17,24,39,0.3)",
          whiteSpace: "nowrap",
        }}
        aria-expanded={open}
      >
        {open ? "◀ Fechar chats" : "Chats ▶"}
      </button>

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: open ? "10px 14px" : "0px",
          borderRadius: 16,
          background: "#fff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: open ? "0 22px 44px rgba(15,23,42,0.22)" : "none",
          maxWidth: open ? 480 : 0,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition:
            "max-width 0.25s ease, padding 0.25s ease, opacity 0.2s ease",
        }}
      >
        {safeButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={handleButtonClick(btn.onClick)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              color: btn.active ? "#fff" : "#1f2937",
              background: btn.active
                ? btn.activeBg || "linear-gradient(135deg,#6366f1,#4338ca)"
                : btn.bg || "rgba(148, 163, 184, 0.18)",
              boxShadow: btn.active
                ? "0 12px 24px rgba(99,102,241,0.28)"
                : "none",
            }}
          >
            <span style={{ fontSize: 16 }}>{btn.icon}</span>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
