"use client";
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

interface DeviceModelSpec {
    device_name: string;
    mesh_url?: string;
    prompt_used?: string;
    error?: string;
    format?: string;
    bounding_box?: number[];
}

interface Props {
    modelSpec: DeviceModelSpec;
}

function createGeometry(shape: string, params: Record<string, number>): THREE.BufferGeometry {
    switch (shape) {
        case 'box':
            return new THREE.BoxGeometry(
                params.width || 1, params.height || 1, params.depth || 1
            );
        case 'cylinder':
            return new THREE.CylinderGeometry(
                params.radiusTop ?? params.radius ?? 0.5,
                params.radiusBottom ?? params.radius ?? 0.5,
                params.height || 1,
                params.segments || 16
            );
        case 'sphere':
            return new THREE.SphereGeometry(
                params.radius || 0.5, params.segments || 16, params.segments || 16
            );
        case 'cone':
            return new THREE.ConeGeometry(
                params.radius || 0.5, params.height || 1, params.segments || 16
            );
        case 'torus':
            return new THREE.TorusGeometry(
                params.radius || 0.5, params.tube || 0.15, 8, params.segments || 24
            );
        case 'plane':
            return new THREE.PlaneGeometry(params.width || 1, params.height || 1);
        case 'capsule':
            return new THREE.CapsuleGeometry(params.radius || 0.3, params.length || 1, 4, 8);
        default:
            return new THREE.BoxGeometry(1, 1, 1);
    }
}

export default function DeviceModelViewer({ modelSpec }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const [loadingMesh, setLoadingMesh] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(modelSpec.error || null);

    useEffect(() => {
        if (!containerRef.current) return;

        if (!modelSpec.mesh_url) {
            setError(modelSpec.error || "No 3D model found");
            return;
        }

        const container = containerRef.current;
        container.innerHTML = ''; // Clear previous renders
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x080a12);
        scene.fog = new THREE.FogExp2(0x080a12, 0.02);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
        const bb = modelSpec.bounding_box || [8, 10, 4];
        const maxDim = Math.max(...bb);
        camera.position.set(maxDim * 1.3, maxDim * 0.8, maxDim * 1.3);
        camera.lookAt(0, 0, 0);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
        controls.minDistance = 3;
        controls.maxDistance = maxDim * 4;

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 15, 10);
        dirLight.castShadow = true;
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-8, 5, -8);
        scene.add(fillLight);

        const rimLight = new THREE.PointLight(0x6366f1, 0.5, 30);
        rimLight.position.set(0, -5, 8);
        scene.add(rimLight);

        // ─── Load Mesh ───
        setLoadingMesh(true);

        const isGLB = modelSpec.mesh_url.toLowerCase().endsWith('.glb') || modelSpec.format === 'glb';

        // Use GLTFLoader for Meshy (.glb), fallback to OBJLoader if ever needed
        if (isGLB) {
            const loader = new GLTFLoader();
            loader.load(
                modelSpec.mesh_url,
                (gltf: any) => {
                    setLoadingMesh(false);
                    const object = gltf.scene;

                    // Center and scale the mesh
                    const box = new THREE.Box3().setFromObject(object);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 10 / maxDim; // Fit within 10 units
                    object.scale.set(scale, scale, scale);

                    // Recalculate bounding box after scaling
                    box.setFromObject(object);
                    const center = box.getCenter(new THREE.Vector3());
                    object.position.sub(center); // Center at origin
                    object.position.y += Math.abs(box.min.y); // Place exactly on the grid

                    // Enhance existing materials
                    object.traverse((child: any) => {
                        if (child instanceof THREE.Mesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;

                            // If material exists, just tweak it to look better in our lighting
                            if (child.material) {
                                child.material.envMapIntensity = 1.0;
                                child.material.needsUpdate = true;
                            }
                        }
                    });

                    scene.add(object);
                },
                (xhr: any) => {
                    // Progress callback
                    console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
                },
                (err: any) => {
                    console.error("Error loading GLB from Meshy", err);
                    setLoadingMesh(false);
                    setError("Failed to load 3D mesh.");
                }
            );
        } else {
            console.error("Unsupported 3D format:", modelSpec.mesh_url);
            setLoadingMesh(false);
            setError("Unsupported mesh format.");
        }

        // ─── Ambient particles ───
        const particleCount = 100;
        const pGeo = new THREE.BufferGeometry();
        const pPositions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount * 3; i++) {
            pPositions[i] = (Math.random() - 0.5) * maxDim * 3;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
        const pMat = new THREE.PointsMaterial({
            color: 0x6366f1, size: 0.04, transparent: true, opacity: 0.4
        });
        scene.add(new THREE.Points(pGeo, pMat));

        // ─── Animation ───
        let frameId: number;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Resize
        const handleResize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', handleResize);
            controls.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [modelSpec]);

    if (error) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-status-error/5 border border-status-error/20 rounded-xl">
                <div className="text-status-error font-bold mb-2 text-lg">3D Generation Failed</div>
                <div className="text-gray-400 text-sm max-w-md text-center">{error}</div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative">
            {loadingMesh && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-deep-graphite/40 backdrop-blur-sm">
                    <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-accent-cyan font-mono text-xs uppercase tracking-widest">Generating with Meshy AI...</p>
                    <p className="text-gray-400 text-[10px] mt-2 max-w-xs text-center">This typically takes 30-60 seconds. Do not refresh.</p>
                </div>
            )}

            {/* Show LLM prompt used for generation */}
            {modelSpec.prompt_used && (
                <div className="absolute bottom-6 left-6 z-10 max-w-lg bg-deep-graphite/80 backdrop-blur-md rounded-xl border border-glass-border p-4 shadow-lg">
                    <div className="text-[10px] text-accent-violet font-bold tracking-widest uppercase mb-1 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-violet mr-2"></span>
                        Meshy AI Prompt
                    </div>
                    <div className="text-gray-300 text-xs italic leading-relaxed">
                        "{modelSpec.prompt_used}"
                    </div>
                </div>
            )}

            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
}
