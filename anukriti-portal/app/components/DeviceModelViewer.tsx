"use client";
import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
// @ts-ignore — three.js examples import works at runtime
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface Part {
    id: string;
    label: string;
    shape: string;
    params: Record<string, number>;
    position: [number, number, number];
    rotation?: [number, number, number];
    color: string;
    opacity?: number;
    metalness?: number;
}

interface Connection {
    from: string;
    to: string;
    color?: string;
    label?: string;
}

interface DeviceModelSpec {
    device_name: string;
    bounding_box?: [number, number, number];
    parts: Part[];
    connections: Connection[];
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

    useEffect(() => {
        if (!containerRef.current || !modelSpec?.parts?.length) return;

        const container = containerRef.current;
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

        // Ground grid
        const grid = new THREE.GridHelper(20, 20, 0x1a1f2e, 0x0f1218);
        grid.position.y = -(bb[1] / 2 + 1);
        scene.add(grid);

        // Track part meshes for connections
        const partPositions: Record<string, THREE.Vector3> = {};

        // ─── Build Parts ───
        modelSpec.parts.forEach((part) => {
            const geo = createGeometry(part.shape, part.params);
            const isTransparent = (part.opacity ?? 1) < 1;

            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(part.color || '#6b7280'),
                transparent: isTransparent,
                opacity: part.opacity ?? 1,
                metalness: part.metalness ?? 0.4,
                roughness: 0.5,
                side: isTransparent ? THREE.DoubleSide : THREE.FrontSide,
            });

            // Add emissive glow for non-transparent parts
            if (!isTransparent) {
                mat.emissive = new THREE.Color(part.color || '#6b7280');
                mat.emissiveIntensity = 0.08;
            }

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(part.position[0], part.position[1], part.position[2]);

            if (part.rotation) {
                mesh.rotation.set(
                    part.rotation[0] * Math.PI / 180,
                    part.rotation[1] * Math.PI / 180,
                    part.rotation[2] * Math.PI / 180
                );
            }

            mesh.castShadow = !isTransparent;
            mesh.receiveShadow = true;
            scene.add(mesh);

            partPositions[part.id] = new THREE.Vector3(
                part.position[0], part.position[1], part.position[2]
            );

            // Wireframe overlay for transparent parts
            if (isTransparent && (part.opacity ?? 1) < 0.3) {
                const wireMat = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(part.color || '#ffffff'),
                    wireframe: true,
                    transparent: true,
                    opacity: 0.15,
                });
                const wireMesh = new THREE.Mesh(geo.clone(), wireMat);
                wireMesh.position.copy(mesh.position);
                wireMesh.rotation.copy(mesh.rotation);
                scene.add(wireMesh);
            }

            // Label sprite
            if (part.label && !isTransparent) {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 128;
                const ctx = canvas.getContext('2d')!;
                // Background
                ctx.fillStyle = 'rgba(11,15,20,0.85)';
                ctx.beginPath();
                ctx.roundRect(0, 0, 512, 128, 16);
                ctx.fill();

                // Border
                ctx.strokeStyle = part.color || '#ffffff';
                ctx.lineWidth = 4;
                ctx.stroke();

                // Component Label
                ctx.fillStyle = part.color || '#ffffff';
                ctx.font = 'bold 36px Inter, sans-serif';
                ctx.textAlign = 'center';
                const displayLabel = part.label.length > 22 ? part.label.substring(0, 20) + '...' : part.label;
                ctx.fillText(displayLabel, 256, 56);

                // Add component type in smaller text
                ctx.fillStyle = '#9ca3af';
                ctx.font = 'bold 24px Inter, sans-serif';
                ctx.fillText(part.shape.toUpperCase(), 256, 96);

                const tex = new THREE.CanvasTexture(canvas);
                const spriteMat = new THREE.SpriteMaterial({
                    map: tex,
                    transparent: true,
                    opacity: 0.95,
                    depthTest: false // Ensures label always appears on top of mesh
                });
                const sprite = new THREE.Sprite(spriteMat);
                const labelHeight = Math.max(part.params.height || 1, part.params.radius ? part.params.radius * 2 : 1);
                sprite.position.set(
                    part.position[0],
                    part.position[1] + labelHeight / 2 + 0.8,
                    part.position[2]
                );
                // Matched aspect ratio of 512x128
                sprite.scale.set(4, 1, 1);
                scene.add(sprite);
            }
        });

        // ─── Build Connections ───
        modelSpec.connections.forEach((conn) => {
            const fromPos = partPositions[conn.from];
            const toPos = partPositions[conn.to];
            if (!fromPos || !toPos) return;

            // Curved line between parts
            const mid = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
            mid.y += 1.0; // Arc upward
            mid.x += (Math.random() - 0.5) * 0.5; // Slight randomness

            const curve = new THREE.QuadraticBezierCurve3(fromPos, mid, toPos);
            const points = curve.getPoints(20);
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineBasicMaterial({
                color: new THREE.Color(conn.color || '#4b5563'),
                transparent: true,
                opacity: 0.5,
            });
            scene.add(new THREE.Line(lineGeo, lineMat));

            // Small sphere at connection endpoints
            const dotGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const dotMat = new THREE.MeshBasicMaterial({ color: conn.color || '#4b5563' });
            const dot1 = new THREE.Mesh(dotGeo, dotMat);
            dot1.position.copy(fromPos);
            scene.add(dot1);
            const dot2 = new THREE.Mesh(dotGeo.clone(), dotMat.clone());
            dot2.position.copy(toPos);
            scene.add(dot2);
        });

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

    return <div ref={containerRef} className="w-full h-full" />;
}
