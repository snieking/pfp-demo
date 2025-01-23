"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function ModelViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 2, 1); // Adjusted light position for character
    scene.add(directionalLight);

    // Add fill light from the other side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-2, 2, -1);
    scene.add(fillLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    
    // Limit vertical orbit to prevent camera going below ground
    controls.maxPolarAngle = Math.PI * 0.5;
    controls.minPolarAngle = 0;

    // Loading manager for progress tracking
    const manager = new THREE.LoadingManager();
    manager.onProgress = (url, loaded, total) => {
      const progress = (loaded / total) * 100;
      setLoadingProgress(progress);
    };
    manager.onError = (url) => {
      setError(`Failed to load model from ${url}`);
    };

    // Create loader with custom request handling
    const loader = new GLTFLoader(manager);
    
    // Load and parse the model
    loader.load(
      url,
      (gltf) => {
        try {
          const model = gltf.scene;
          console.log('Model loaded successfully:', {
            children: model.children.length,
            animations: gltf.animations?.length
          });
          
          // Center the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Place model at the bottom center
          model.position.set(
            -center.x, // Center horizontally
            -center.y + (size.y / 1.5), // Place feet at ground level
            -center.z // Center depth
          );
          
          // Calculate scale to fit in view
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 15.0 / size.y; // Doubled scale for much closer view
          model.scale.setScalar(scale);
          
          // Position camera for character view
          const cameraDistance = size.y * 0.8; // Brought camera much closer
          camera.position.set(0, size.y * 0.5, cameraDistance); // Adjusted height
          camera.lookAt(0, size.y * 0.4, 0); // Look slightly lower
          
          // Set camera limits based on model size
          controls.minDistance = size.y * 0.3; // Allow very close zoom
          controls.maxDistance = size.y * 1.2; // Restrict zoom out
          
          // Add model to scene
          scene.add(model);
          
          // Update controls target to character's center mass
          controls.target.set(0, size.y * 0.4, 0);
          controls.update();
          
          setLoadingProgress(100);
        } catch (error) {
          console.error('Error setting up model:', error);
          setError('Failed to set up model');
        }
      },
      (progress) => {
        if (progress.lengthComputable) {
          const percent = (progress.loaded / progress.total) * 100;
          setLoadingProgress(percent);
        }
      },
      (error) => {
        console.error('Error loading model:', error);
        setError(error instanceof Error ? error.message : 'Failed to load model');
      }
    );

    // Handle resize
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update(); // needed for damping
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [url]);

  return (
    <div className="relative w-full h-full" style={{ aspectRatio: '1/1', minHeight: '300px' }}>
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Loading overlay */}
      {loadingProgress < 100 && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
            <p className="text-blue-200">Loading model... {Math.round(loadingProgress)}%</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center space-y-2 p-4">
            <p className="text-red-400">Failed to load model</p>
            <p className="text-sm text-blue-200">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
} 