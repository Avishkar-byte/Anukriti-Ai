"use client";
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface DeviceTwinViewerProps {
    deviceType?: string;
}

export default function DeviceTwinViewer({ deviceType = 'infusion' }: DeviceTwinViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f111a);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(4, 3, 5);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2 for perf
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.5;
        controlsRef.current = controls;

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(8, 12, 8);
        dirLight.castShadow = true;
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-5, 4, -5);
        scene.add(fillLight);

        // Grid
        const grid = new THREE.GridHelper(12, 24, 0x333333, 0x222222);
        scene.add(grid);

        // Build the device model
        const model = buildDeviceModel(deviceType);
        scene.add(model);

        // Resize handler
        const onResize = () => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', onResize);

        // Animation loop
        const animate = () => {
            frameRef.current = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(frameRef.current);
            window.removeEventListener('resize', onResize);
            controls.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [deviceType]);

    return (
        <div ref={containerRef} className="w-full h-full" />
    );
}

function buildDeviceModel(type: string): THREE.Group {
    const group = new THREE.Group();

    const matBody = new THREE.MeshStandardMaterial({ color: 0xF3E8FF, roughness: 0.15, metalness: 0.1 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    const matChrome = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.05, metalness: 0.9 });
    const matScreen = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
    const matAccent = new THREE.MeshStandardMaterial({ color: 0x00B4D8 });
    const matTransparent = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0,
    });

    if (type === 'ventilator') {
        // Cart Base
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), matDark);
        base.position.y = 0.1;
        group.add(base);

        // Wheels
        [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]].forEach(([x, z]) => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), matDark);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.08, z);
            group.add(wheel);
        });

        // Pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 16), matChrome);
        pole.position.set(0, 0.7, -0.2);
        group.add(pole);

        // Main Unit
        const unit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.5), matBody);
        unit.position.set(0, 1.4, -0.1);
        unit.castShadow = true;
        group.add(unit);

        // Screen
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.02), matScreen);
        screen.position.set(0, 1.45, 0.16);
        group.add(screen);

        // Breathing Circuit
        const humid = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3), matTransparent);
        humid.position.set(-0.4, 1.2, -0.1);
        group.add(humid);

        const hose = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 20, 2.5), matAccent);
        hose.position.set(-0.5, 1.2, 0.1);
        hose.rotation.y = Math.PI / 2;
        group.add(hose);
    }
    else if (type === 'ecg') {
        matBody.color.set(0xDCFCE7);

        // Stand
        for (let i = 0; i < 5; i++) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), matChrome);
            leg.rotation.y = (i * Math.PI * 2) / 5;
            leg.position.y = 0.1;
            group.add(leg);
        }
        const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 16), matDark);
        standPole.position.y = 0.65;
        group.add(standPole);

        const platform = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.5), matBody);
        platform.position.y = 1.2;
        group.add(platform);

        // Monitor
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.15), matBody);
        monitor.position.set(0, 1.5, 0);
        monitor.castShadow = true;
        group.add(monitor);

        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), matScreen);
        screen.position.set(0, 1.5, 0.08);
        group.add(screen);

        // ECG Leads Hub
        const hub = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.2), matAccent);
        hub.position.set(0.2, 1.25, 0.15);
        group.add(hub);
    }
    else if (type === 'mri') {
        matBody.color.set(0xE0E7FF);

        // Gantry
        const gantryOuter = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 32), matBody);
        gantryOuter.rotation.z = Math.PI / 2;
        gantryOuter.position.y = 1.3;
        gantryOuter.castShadow = true;
        group.add(gantryOuter);

        // Bore
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.81, 32), matDark);
        bore.rotation.z = Math.PI / 2;
        bore.position.y = 1.3;
        group.add(bore);

        // Base
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), matBody);
        base.position.y = 0.25;
        group.add(base);

        // Patient Table
        const tableBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.4), matBody);
        tableBase.position.set(-1.5, 0.4, 0);
        group.add(tableBase);

        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.5), matChrome);
        tableTop.position.set(-0.8, 0.85, 0);
        group.add(tableTop);
    }
    else {
        // Default: Infusion Pump
        // Standing Pole
        const poleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.1, 0.2, 6), matDark);
        poleBase.position.y = 0.1;
        group.add(poleBase);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8), matChrome);
        pole.position.y = 1.0;
        group.add(pole);

        // Top Hook
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 16, Math.PI), matChrome);
        hook.position.set(0, 1.9, 0);
        group.add(hook);

        // Pump Unit 1
        const pump1 = createInfusionUnit(matBody, matScreen);
        pump1.position.set(0, 1.5, 0);
        group.add(pump1);

        // Pump Unit 2
        const pump2 = createInfusionUnit(matBody, matScreen);
        pump2.position.set(0, 1.1, 0);
        group.add(pump2);
    }

    return group;
}

function createInfusionUnit(matBody: THREE.Material, matScreen: THREE.Material): THREE.Group {
    const unitGroup = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), matBody);
    unitGroup.add(box);

    const face = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.05), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    face.position.set(0, 0, 0.15);
    unitGroup.add(face);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), matScreen);
    screen.position.set(0, 0.08, 0.18);
    unitGroup.add(screen);

    return unitGroup;
}
