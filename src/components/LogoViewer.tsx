"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

export default function LogoViewer() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId: number;

    const timer = setTimeout(() => {
      const mount = mountRef.current;
      if (!mount) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.set(0, 0, 7);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(85, 85);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.8));

      const key = new THREE.DirectionalLight(0xffffff, 3.0);
      key.position.set(3, 5, 4);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xffffff, 0.6);
      fill.position.set(-3, 2, 2);
      scene.add(fill);

      // rotating sheen light for reflection effect
      const sheenLight = new THREE.DirectionalLight(0xffffff, 4.0);
      sheenLight.position.set(4, 2, 3);
      scene.add(sheenLight);

      const colorMap: Record<string, number> = {
        model:   0x111111,
        Black_1: 0x111111,
        Black_2: 0x111111,
        Red_1:   0xcc0000,
        Red_2:   0xcc0000,
        Red_3:   0xcc0000,
      };

      const metalnessMap: Record<string, number> = {
        model:   0.95,
        Black_1: 0.95,
        Black_2: 0.95,
        Red_1:   0.7,
        Red_2:   0.7,
        Red_3:   0.7,
      };

      const roughnessMap: Record<string, number> = {
        model:   0.1,
        Black_1: 0.1,
        Black_2: 0.1,
        Red_1:   0.3,
        Red_2:   0.3,
        Red_3:   0.3,
      };

      let logoObj: THREE.Object3D | null = null;

      const loader = new OBJLoader();
      loader.load("/3d%20Logo/Logo.obj", (obj) => {
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
      });

      let sheenAngle = 0;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        if (logoObj) logoObj.rotation.y += 0.008;
        sheenAngle += 0.012;
        sheenLight.position.set(
          Math.cos(sheenAngle) * 5,
          2,
          Math.sin(sheenAngle) * 5
        );
        renderer.render(scene, camera);
      };
      animate();
    }, 100);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animId);
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []);

  return <div ref={mountRef} style={{ width: 85, height: 85 }} />;
}
