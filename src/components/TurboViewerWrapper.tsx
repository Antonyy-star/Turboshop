"use client";

import dynamic from "next/dynamic";

const TurboViewer = dynamic(() => import("./TurboViewer"), { ssr: false });

export default function TurboViewerWrapper() {
  return <TurboViewer />;
}
