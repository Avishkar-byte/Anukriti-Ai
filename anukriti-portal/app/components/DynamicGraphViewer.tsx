"use client";
import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GraphNode, GraphEdge } from '../context/ProjectContext';

interface DynamicGraphViewerProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    deviceName?: string;
}

// ─── Color palette per node type ───────────
const TYPE_CONFIG: Record<string, { color: number; emissive: number; shape: 'box' | 'sphere' | 'octahedron' | 'cylinder' | 'cone'; scale: number }> = {
    'Component': { color: 0x3b82f6, emissive: 0x1e40af, shape: 'box', scale: 1.0 },
    'Interface': { color: 0x06b6d4, emissive: 0x0e7490, shape: 'cylinder', scale: 0.7 },
    'Constraint': { color: 0xef4444, emissive: 0x991b1b, shape: 'octahedron', scale: 0.5 },
    'Input': { color: 0x22c55e, emissive: 0x166534, shape: 'cone', scale: 0.6 },
    'Output': { color: 0xa855f7, emissive: 0x7e22ce, shape: 'sphere', scale: 0.6 },
};

const DEFAULT_CONFIG = { color: 0x6b7280, emissive: 0x374151, shape: 'box' as const, scale: 0.7 };

// ─── 3D layout: positions nodes in a multi-ring radial layout ───
function computeLayout(nodes: GraphNode[], edges: GraphEdge[]) {
    const positions: Record<string, THREE.Vector3> = {};

    // Find root
    const root = nodes.find(n => n.id === 'SYS_ROOT');
    const components = nodes.filter(n => n.type === 'Component' && n.id !== 'SYS_ROOT');
    const interfaces = nodes.filter(n => n.type === 'Interface');
    const constraints = nodes.filter(n => n.type === 'Constraint');
    const others = nodes.filter(n =>
        n.id !== 'SYS_ROOT' && n.type !== 'Component' && n.type !== 'Interface' && n.type !== 'Constraint'
    );

    // Root at center, slightly elevated
    if (root) positions[root.id] = new THREE.Vector3(0, 2, 0);

    // Components in inner ring
    const compRadius = Math.max(3, components.length * 0.8);
    components.forEach((node, i) => {
        const angle = (i / components.length) * Math.PI * 2;
        const x = Math.cos(angle) * compRadius;
        const z = Math.sin(angle) * compRadius;
        const y = 0.5 + Math.sin(i * 1.3) * 0.5; // slight y variation
        positions[node.id] = new THREE.Vector3(x, y, z);
    });

    // Interfaces in middle ring
    const ifRadius = compRadius + 2;
    interfaces.forEach((node, i) => {
        const angle = (i / Math.max(interfaces.length, 1)) * Math.PI * 2 + 0.3;
        const x = Math.cos(angle) * ifRadius;
        const z = Math.sin(angle) * ifRadius;
        positions[node.id] = new THREE.Vector3(x, -0.5, z);
    });

    // Constraints in outer ring
    const conRadius = ifRadius + 2;
    constraints.forEach((node, i) => {
        const angle = (i / Math.max(constraints.length, 1)) * Math.PI * 2 + 0.15;
        const x = Math.cos(angle) * conRadius;
        const z = Math.sin(angle) * conRadius;
        positions[node.id] = new THREE.Vector3(x, -1.5, z);
    });

    // Others scattered
    others.forEach((node, i) => {
        const angle = (i / Math.max(others.length, 1)) * Math.PI * 2;
        positions[node.id] = new THREE.Vector3(
            Math.cos(angle) * (conRadius + 1.5),
            -2,
            Math.sin(angle) * (conRadius + 1.5)
        );
    });

    return positions;
}

// ─── Create a 3D shape for a node ───
function createNodeMesh(node: GraphNode, position: THREE.Vector3): THREE.Group {
    const config = TYPE_CONFIG[node.type] || DEFAULT_CONFIG;
    const group = new THREE.Group();

    const material = new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.emissive,
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.4,
    });

    let geometry: THREE.BufferGeometry;
    const s = config.scale;

    switch (config.shape) {
        case 'sphere':
            geometry = new THREE.SphereGeometry(0.35 * s, 16, 16);
            break;
        case 'octahedron':
            geometry = new THREE.OctahedronGeometry(0.35 * s);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.25 * s, 0.25 * s, 0.5 * s, 16);
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(0.3 * s, 0.6 * s, 16);
            break;
        default:
            geometry = new THREE.BoxGeometry(0.5 * s, 0.5 * s, 0.5 * s);
            // Round the edges with bevel
            break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Glow ring around node
    const ringGeometry = new THREE.RingGeometry(0.4 * s, 0.5 * s, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.25 * s;
    group.add(ring);

    // Label sprite
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
    ctx.strokeStyle = '#' + config.color.toString(16).padStart(6, '0');
    ctx.lineWidth = 4;
    ctx.stroke();

    // Type label (small)
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = '#' + config.color.toString(16).padStart(6, '0');
    ctx.textAlign = 'center';
    ctx.fillText(node.type.toUpperCase(), 256, 35);

    // Name label
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    const displayLabel = node.label.length > 22 ? node.label.substring(0, 20) + '...' : node.label;
    ctx.fillText(displayLabel, 256, 75);

    // Req count
    if (node.trace_req_ids && node.trace_req_ids.length > 0) {
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(`${node.trace_req_ids.length} constraint(s)`, 256, 110);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        depthTest: false // Ensures label always appears on top of mesh
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(4, 1, 1);
    sprite.position.y = 0.6 * s + 0.8;
    group.add(sprite);

    group.position.copy(position);
    return group;
}

// ─── Create edge line between two positions ───
function createEdge(from: THREE.Vector3, to: THREE.Vector3, relation: string): THREE.Group {
    const group = new THREE.Group();

    // Calculate midpoint for curve
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.y += 0.3; // slight arc upward

    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const points = curve.getPoints(20);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

    // Color by relation type
    let lineColor = 0x4b5563;
    if (relation.includes('power')) lineColor = 0xeab308;
    else if (relation.includes('satisf')) lineColor = 0x22c55e;
    else if (relation.includes('interface')) lineColor = 0x06b6d4;
    else if (relation.includes('subsystem')) lineColor = 0x3b82f6;
    else if (relation.includes('constrain')) lineColor = 0xef4444;

    const lineMaterial = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.4,
    });

    const line = new THREE.Line(lineGeometry, lineMaterial);
    group.add(line);

    // Small sphere at destination end (arrow substitute)
    const dotGeom = new THREE.SphereGeometry(0.05, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: lineColor });
    const dot = new THREE.Mesh(dotGeom, dotMat);
    dot.position.copy(to);
    group.add(dot);

    return group;
}

// ─── Main Component ───────────────────────
export default function DynamicGraphViewer({ nodes, edges, deviceName }: DynamicGraphViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || nodes.length === 0) return;

        // Cleanup previous scene
        if (cleanupRef.current) cleanupRef.current();

        // ─── Scene Setup ───
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0d14);
        scene.fog = new THREE.FogExp2(0x0a0d14, 0.04);

        const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
        camera.position.set(8, 6, 10);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
        controls.target.set(0, 0, 0);

        // ─── Lighting ───
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight.position.set(10, 15, 10);
        dirLight.castShadow = true;
        scene.add(dirLight);

        const blueLight = new THREE.PointLight(0x3b82f6, 0.5, 30);
        blueLight.position.set(-5, 5, -5);
        scene.add(blueLight);

        const cyanLight = new THREE.PointLight(0x06b6d4, 0.3, 30);
        cyanLight.position.set(5, 3, 5);
        scene.add(cyanLight);

        // ─── Ground plane ───
        const groundGeom = new THREE.CircleGeometry(20, 64);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x111827,
            roughness: 0.9,
        });
        const ground = new THREE.Mesh(groundGeom, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2.5;
        ground.receiveShadow = true;
        scene.add(ground);

        // Grid
        const grid = new THREE.GridHelper(24, 48, 0x1f2937, 0x111827);
        grid.position.y = -2.49;
        scene.add(grid);

        // ─── Build graph ───
        const positions = computeLayout(nodes, edges);

        // Nodes
        const nodeGroups: Record<string, THREE.Group> = {};
        nodes.forEach(node => {
            const pos = positions[node.id];
            if (!pos) return;

            // Root node is special
            if (node.id === 'SYS_ROOT') {
                const rootGroup = new THREE.Group();

                // Larger glowing sphere for root
                const rootGeom = new THREE.IcosahedronGeometry(0.6, 2);
                const rootMat = new THREE.MeshStandardMaterial({
                    color: 0x8b5cf6,
                    emissive: 0x6d28d9,
                    emissiveIntensity: 0.5,
                    roughness: 0.2,
                    metalness: 0.6,
                });
                const rootMesh = new THREE.Mesh(rootGeom, rootMat);
                rootMesh.castShadow = true;
                rootGroup.add(rootMesh);

                // Root label
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 128;
                const ctx = canvas.getContext('2d')!;
                ctx.font = 'bold 32px Arial';
                ctx.fillStyle = '#a78bfa';
                ctx.textAlign = 'center';
                ctx.fillText('ROOT SYSTEM', 256, 40);
                ctx.font = '28px Arial';
                ctx.fillStyle = '#ffffff';
                const label = (deviceName || node.label).substring(0, 30);
                ctx.fillText(label, 256, 80);

                const texture = new THREE.CanvasTexture(canvas);
                const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
                sprite.scale.set(3, 0.7, 1);
                sprite.position.y = 1.2;
                rootGroup.add(sprite);

                rootGroup.position.copy(pos);
                scene.add(rootGroup);
                nodeGroups[node.id] = rootGroup;
            } else {
                const nodeGroup = createNodeMesh(node, pos);
                scene.add(nodeGroup);
                nodeGroups[node.id] = nodeGroup;
            }
        });

        // Edges
        edges.forEach(edge => {
            const fromPos = positions[edge.source];
            const toPos = positions[edge.target];
            if (!fromPos || !toPos) return;
            const edgeGroup = createEdge(fromPos, toPos, edge.relation);
            scene.add(edgeGroup);
        });

        // Center camera on the graph
        const allPositions = Object.values(positions);
        if (allPositions.length > 0) {
            const center = new THREE.Vector3();
            allPositions.forEach(p => center.add(p));
            center.divideScalar(allPositions.length);
            controls.target.copy(center);
        }

        // ─── Particle system (ambient atmosphere) ───
        const particleCount = 200;
        const particleGeom = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            particlePositions[i * 3] = (Math.random() - 0.5) * 30;
            particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 15;
            particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
        }
        particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x3b82f6,
            size: 0.03,
            transparent: true,
            opacity: 0.4,
        });
        const particles = new THREE.Points(particleGeom, particleMat);
        scene.add(particles);

        // ─── Animation ───
        let frameId: number;
        let time = 0;

        const animate = () => {
            frameId = requestAnimationFrame(animate);
            time += 0.01;

            // Gentle bob for nodes
            Object.entries(nodeGroups).forEach(([id, group]) => {
                if (id === 'SYS_ROOT') {
                    group.rotation.y += 0.005;
                    group.position.y = 2 + Math.sin(time * 2) * 0.1;
                } else {
                    group.position.y += Math.sin(time * 1.5 + group.position.x) * 0.001;
                }
            });

            // Rotate particles slowly
            particles.rotation.y += 0.0005;

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // ─── Resize ───
        const onResize = () => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', onResize);

        // ─── Cleanup ───
        const cleanup = () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', onResize);
            controls.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
        cleanupRef.current = cleanup;
        return cleanup;
    }, [nodes, edges, deviceName]);

    if (nodes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#0a0d14]">
                <div className="text-center space-y-3">
                    <p className="text-4xl">🕸️</p>
                    <p className="text-gray-500 text-sm">Build the Architecture Graph first to see the 3D view</p>
                </div>
            </div>
        );
    }

    return <div ref={containerRef} className="w-full h-full" />;
}
