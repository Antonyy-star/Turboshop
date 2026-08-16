"use client";

import dynamic from "next/dynamic";

const LogoViewer = dynamic(() => import("./LogoViewer"), { ssr: false });

export default function LogoViewerWrapper() {
  return <LogoViewer />;
}
