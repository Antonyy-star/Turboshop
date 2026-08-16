"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const SIZE = 112;

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

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      "/3d%20Logo/Logo.pack.glb",
      (gltf) => {
        const colorConfig = [
          { name: "Black_1", color: 0x111111, metalness: 0.95, roughness: 0.1 },
          { name: "Black_2", color: 0x111111, metalness: 0.95, roughness: 0.1 },
          { name: "Red_1",   color: 0xcc0000, metalness: 0.7,  roughness: 0.3 },
          { name: "Red_2",   color: 0xcc0000, metalness: 0.7,  roughness: 0.3 },
          { name: "Red_3",   color: 0xcc0000, metalness: 0.7,  roughness: 0.3 },
        ];
        colorConfig.forEach(({ name, color, metalness, roughness }) => {
          const node = gltf.scene.getObjectByName(name);
          if (node) {
            node.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
              }
            });
          }
        });
        // Fallback: any mesh still using default material gets dark color
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh && !Array.isArray(child.material) && !(child.material as THREE.MeshStandardMaterial).color) {
            child.material = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.95, roughness: 0.1 });
          }
        });
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
        gltf.scene.position.sub(center);
        gltf.scene.position.y -= 0.2;
        gltf.scene.scale.setScalar(3 / maxDim);
        scene.add(gltf.scene);
        logoObj = gltf.scene;
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
    return <div style={{ width: SIZE, height: SIZE }} />;
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
