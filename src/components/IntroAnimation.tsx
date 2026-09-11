"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const LogoViewer = dynamic(() => import("./LogoViewer"), { ssr: false });

export default function IntroAnimation() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("tt_intro_shown")) return;
    sessionStorage.setItem("tt_intro_shown", "1");
    setVisible(true);
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => dismiss(), 3800);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    document.body.style.overflow = "";
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          onClick={dismiss}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {/* Red top glow */}
          <div style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 400,
            height: 2,
            background: "linear-gradient(to right, transparent, #cc0000, transparent)",
          }} />

          {/* 3D Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <LogoViewer size={260} />
          </motion.div>

          {/* Brand name */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6, ease: "easeOut" }}
            style={{ textAlign: "center", marginTop: 24 }}
          >
            <p style={{
              color: "#fff",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            }}>
              Turbo<span style={{ color: "#cc0000" }}>Teknik</span>
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              style={{
                color: "#444",
                fontSize: 11,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                marginTop: 8,
              }}
            >
              Premium turbos &amp; bilddelar
            </motion.p>
          </motion.div>

          {/* Red bottom bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: "linear-gradient(to right, transparent, #cc0000 30%, #ff2200 50%, #cc0000 70%, transparent)",
              transformOrigin: "center",
            }}
          />

          {/* Skip hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.4 }}
            style={{
              position: "absolute",
              bottom: 24,
              color: "#2a2a2a",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Klicka för att hoppa över
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
