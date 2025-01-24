"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface ModelViewerProps {
  url: string;
}

export function ModelViewer({ url }: ModelViewerProps) {
  console.log('ModelViewer render start');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Add debug log for component mount
  useEffect(() => {
    const id = Math.random().toString(36).substr(2, 9);
    console.log(`ModelViewer[${id}] mounted with URL:`, url);
    return () => {
      console.log(`ModelViewer[${id}] unmounted with URL:`, url);
    };
  }, [url]);

  useEffect(() => {
    if (!containerRef.current) return;
    console.log('ModelViewer initializing scene for URL:', url);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x000000);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 2, 4);
    camera.lookAt(0, 1, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 2, 1);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-2, 2, -1);
    scene.add(fillLight);

    // Model loading
    const loader = new GLTFLoader();
    let currentModel: THREE.Object3D | null = null;

    const loadModel = async () => {
      try {
        const gltf = await loader.loadAsync(url, (event) => {
          setLoadingProgress(Math.round((event.loaded / event.total) * 100));
        });

        if (currentModel) {
          scene.remove(currentModel);
          currentModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(material => material.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });
        }

        currentModel = gltf.scene;
        scene.add(currentModel);

        // Calculate bounding box
        const bbox = new THREE.Box3().setFromObject(currentModel);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        // Calculate scale to fit model within reference size
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1 / maxDim;
        currentModel.scale.setScalar(scale * 2);

        // Center model vertically and move to ground
        currentModel.position.y = -center.y * scale;
        currentModel.position.x = -center.x * scale;
        currentModel.position.z = -center.z * scale;

        // Adjust camera based on model height
        const scaledHeight = size.y * scale * 2;
        camera.position.set(0, scaledHeight * 0.8, scaledHeight * 2);
        controls.target.set(0, scaledHeight * 0.4, 0);
        controls.update();

        // Set camera limits
        controls.maxDistance = scaledHeight * 4;
        controls.minDistance = scaledHeight;
        controls.maxPolarAngle = Math.PI * 0.5;
        controls.minPolarAngle = 0;

        setError(null);
      } catch (err) {
        console.error('Error loading model:', err);
        setError('Failed to load model');
      }
    };

    loadModel();

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      console.log('Cleaning up ModelViewer resources');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      controls.dispose();

      if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });

      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      
      sceneRef.current = null;
      rendererRef.current = null;
    };
  }, [url]);

  return (
    <div 
      ref={containerRef} 
      className="w-full aspect-square relative bg-black"
    >
      {loadingProgress < 100 && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          Loading... {loadingProgress}%
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500">
          {error}
        </div>
      )}
    </div>
  );
} 