"use client";

import { useState } from "react";

export default function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden" style={{ height: 400 }}>
        <img
          src={images[active]}
          alt={name}
          className="w-full h-full object-contain p-4"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`border-2 rounded-lg overflow-hidden flex-shrink-0 transition ${
                i === active ? "border-red-500" : "border-gray-200 hover:border-gray-400"
              }`}
              style={{ width: 80, height: 80 }}
            >
              <img src={img} alt={`${name} ${i + 1}`} className="w-full h-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
