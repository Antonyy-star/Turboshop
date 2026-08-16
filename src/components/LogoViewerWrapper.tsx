"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const LogoViewer = dynamic(() => import("./LogoViewer"), { ssr: false });

export default function LogoViewerWrapper() {
  const [size, setSize] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setSize(window.innerWidth < 768 ? 64 : 140);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!size) return null;
  return <LogoViewer size={size} />;
}
