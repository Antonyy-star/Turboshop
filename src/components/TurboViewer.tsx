"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

export default function TurboViewer() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId: number;

    const timer = setTimeout(() => {
      const mount = mountRef.current;
      if (!mount) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.set(0, 0, 5);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(256, 256);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.borderRadius = "50%";
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.4));

      const key = new THREE.DirectionalLight(0xffffff, 4.0);
      key.position.set(2, 5, 4);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xccddff, 1.2);
      fill.position.set(-4, 1, 2);
      scene.add(fill);

      const redRim = new THREE.DirectionalLight(0xff2200, 3.0);
      redRim.position.set(-2, -4, -5);
      scene.add(redRim);

      const redPoint = new THREE.PointLight(0xff1100, 2.0, 6);
      redPoint.position.set(-2, -1, -2);
      scene.add(redPoint);

      const colorMap: Record<string, number> = {
        model: 0xe8e8ec,
        "model.001": 0xff2200,
        "model.002": 0xe8e8ec,
      };

      let turboObj: THREE.Object3D | null = null;
      let bladeMeshRef: THREE.Mesh | null = null;

      const loader = new OBJLoader();
      loader.load("/images/NEWbase.obj", (obj) => {
        let bladeMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null;

        obj.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: colorMap[child.name] ?? 0xe8e8ec,
              metalness: 0.95,
              roughness: 0.15,
            });
            if (child.name === "model.001") bladeMesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
          }
        });

        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
        obj.position.sub(center);
        obj.position.y -= 0.3;
        obj.scale.setScalar(3 / maxDim);

        scene.add(obj);
        turboObj = obj;

        if (bladeMesh) {
          bladeMesh.geometry.computeBoundingBox();
          const bc = new THREE.Vector3();
          bladeMesh.geometry.boundingBox!.getCenter(bc);
          bladeMesh.geometry.translate(-bc.x, -bc.y, -bc.z);
          bladeMesh.position.add(bc);
          bladeMeshRef = bladeMesh;
        }
      });

      const animate = () => {
        animId = requestAnimationFrame(animate);
        if (turboObj) turboObj.rotation.y += 0.005;
        if (bladeMeshRef) bladeMeshRef.rotation.x -= 0.25;
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

  return <div ref={mountRef} style={{ width: 256, height: 256 }} />;
}
