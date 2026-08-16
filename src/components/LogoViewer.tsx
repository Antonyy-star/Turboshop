"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const SIZE = 70;

export default function LogoViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let animId: number;
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 7);

    renderer.setSize(SIZE, SIZE);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-3, 2, 2);
    scene.add(fill);
    const sheenLight = new THREE.DirectionalLight(0xffffff, 4.0);
    sheenLight.position.set(4, 2, 3);
    scene.add(sheenLight);

    const colorMap: Record<string, number> = {
      model: 0x111111, Black_1: 0x111111, Black_2: 0x111111,
      Red_1: 0xcc0000, Red_2: 0xcc0000, Red_3: 0xcc0000,
    };
    const metalnessMap: Record<string, number> = {
      model: 0.95, Black_1: 0.95, Black_2: 0.95,
      Red_1: 0.7, Red_2: 0.7, Red_3: 0.7,
    };
    const roughnessMap: Record<string, number> = {
      model: 0.1, Black_1: 0.1, Black_2: 0.1,
      Red_1: 0.3, Red_2: 0.3, Red_3: 0.3,
    };

    let logoObj: THREE.Object3D | null = null;
    let sheenAngle = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (logoObj) logoObj.rotation.y += 0.008;
      sheenAngle += 0.012;
      sheenLight.position.set(Math.cos(sheenAngle) * 5, 2, Math.sin(sheenAngle) * 5);
      renderer.render(scene, camera);
    };
    animate();

    const loader = new OBJLoader();
    loader.load(
      "/3d%20Logo/Logo.obj",
      (obj) => {
        obj.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            const color = colorMap[child.name] ?? 0x111111;
            child.material = new THREE.MeshStandardMaterial({
              color,
              metalness: metalnessMap[child.name] ?? 0.9,
              roughness: roughnessMap[child.name] ?? 0.15,
            });
          }
        });
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
        obj.position.sub(center);
        obj.position.y -= 0.2;
        obj.scale.setScalar(3 / maxDim);
        scene.add(obj);
        logoObj = obj;
        setLoaded(true);
      },
      undefined,
      () => {
        setFailed(true);
        cancelAnimationFrame(animId);
        renderer.dispose();
      }
    );

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []);

  if (failed) {
    return (
      <div style={{ width: SIZE, height: SIZE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="20" stroke="#cc0000" strokeWidth="2.5" />
          <circle cx="22" cy="22" r="7" fill="#cc0000" />
          <circle cx="22" cy="22" r="3" fill="#fff" />
          <path d="M22 4v6M22 34v6M4 22h6M34 22h6M9 9l4 4M31 31l4 4M31 9l4-4M9 35l4-4" stroke="#cc0000" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div style={{ width: SIZE, height: SIZE, position: "relative" }}>
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "2px solid #cc0000",
            borderTopColor: "transparent",
            animation: "spin-gear 0.8s linear infinite",
          }} />
        </div>
      )}
      <div ref={mountRef} style={{ width: SIZE, height: SIZE, opacity: loaded ? 1 : 0, transition: "opacity 0.3s" }} />
    </div>
  );
}
