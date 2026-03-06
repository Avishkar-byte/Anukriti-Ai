"use client";
import Layout from '../components/Layout';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import PrimaryButton from '../components/ui/PrimaryButton';
import { Network, Box, MonitorSmartphone, Cpu, Activity, RefreshCw, Zap, Layers } from 'lucide-react';

// Old static viewer as fallback
const DeviceTwinViewer = dynamic(() => import('../components/DeviceTwinViewer'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-transparent">
            <div className="text-center space-y-4">
                <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto drop-shadow-[0_0_10px_rgba(97,218,251,0.5)]"></div>
                <p className="text-muted-text text-sm font-mono uppercase tracking-widest">Waking Render Engine...</p>
            </div>
        </div>
    )
});

// New dynamic graph-based viewer
const DynamicGraphViewer = dynamic(() => import('../components/DynamicGraphViewer'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-transparent">
            <div className="text-center space-y-4">
                <div className="w-10 h-10 border-2 border-accent-violet border-t-transparent rounded-full animate-spin mx-auto drop-shadow-[0_0_10px_rgba(189,147,249,0.5)]"></div>
                <p className="text-muted-text text-sm font-mono uppercase tracking-widest">Compiling Spatials...</p>
            </div>
        </div>
    )
});

// LLM-generated 3D device model viewer
const DeviceModelViewer = dynamic(() => import('../components/DeviceModelViewer'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-transparent">
            <div className="text-center space-y-4">
                <div className="w-10 h-10 border-2 border-status-warning border-t-transparent rounded-full animate-spin mx-auto drop-shadow-[0_0_10px_rgba(255,184,108,0.5)]"></div>
                <p className="text-muted-text text-sm font-mono uppercase tracking-widest">Raytracing Artifact...</p>
            </div>
        </div>
    )
});

const FALLBACK_DEVICES = [
    { id: 'infusion', name: 'Infusion Pump', icon: <Activity size={16} /> },
    { id: 'ventilator', name: 'Ventilator', icon: <Zap size={16} /> },
    { id: 'ecg', name: 'ECG Monitor', icon: <MonitorSmartphone size={16} /> },
    { id: 'mri', name: 'MRI Scanner', icon: <Layers size={16} /> },
];

export default function DigitalTwins() {
    const { activeProject, generate3DModel } = useProject();
    const [selectedDevice, setSelectedDevice] = useState('infusion');
    const [viewMode, setViewMode] = useState<'graph' | 'model' | 'device'>('graph');
    const [modelSpec, setModelSpec] = useState<any>(activeProject?.model_3d || null);
    const [generating3D, setGenerating3D] = useState(false);

    const hasGraph = (activeProject?.graph?.nodes?.length ?? 0) > 0;

    useEffect(() => {
        if (activeProject?.model_3d && !modelSpec) setModelSpec(activeProject.model_3d);
    }, [activeProject]);

    useEffect(() => {
        setViewMode(hasGraph ? 'graph' : 'device');
    }, [hasGraph]);

    const handleGenerate3D = async () => {
        if (!activeProject?.graph) { alert("Build architecture graph first."); return; }
        setGenerating3D(true);
        const spec = await generate3DModel();
        setGenerating3D(false);
        if (spec) {
            setModelSpec(spec);
            setViewMode('model');
        }
    };

    const requirements = activeProject?.requirements?.requirements || [];
    const graphNodes = activeProject?.graph?.nodes || [];
    const graphEdges = activeProject?.graph?.edges || [];

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-6 relative min-h-full flex flex-col pb-16">

                <header className="flex justify-between items-end shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                            Digital Twin Console
                        </h1>
                        <p className="text-muted-text mt-2 text-sm">
                            {activeProject ? `Project: ${activeProject.name}` : 'No project selected'}
                        </p>
                    </div>
                </header>

                {!activeProject?.requirements && (
                    <GlassCard className="p-4 border-status-warning/40 bg-status-warning/5 shrink-0">
                        <p className="text-sm text-status-warning flex items-center">
                            <Zap size={16} className="mr-2" /> Complete Requirements → Architecture → Simulation pipeline first to generate bespoke twins.
                        </p>
                    </GlassCard>
                )}

                {/* View Controls & Device Selection */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                    {/* View mode toggles */}
                    <div className="flex p-1 bg-deep-graphite/50 backdrop-blur-md rounded-xl border border-glass-border shadow-inner self-start">
                        <button
                            onClick={() => setViewMode('graph')}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'graph'
                                ? 'bg-accent-violet/20 text-accent-violet shadow-[0_0_15px_rgba(189,147,249,0.2)]'
                                : 'text-muted-text hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Network size={16} className="mr-2" />
                            Topology
                            {hasGraph && <span className="ml-2 w-1.5 h-1.5 bg-status-success rounded-full shadow-[0_0_5px_rgba(80,250,123,0.8)]"></span>}
                        </button>

                        <button
                            onClick={() => modelSpec ? setViewMode('model') : handleGenerate3D()}
                            disabled={generating3D || !hasGraph}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'model'
                                ? 'bg-status-warning/20 text-status-warning shadow-[0_0_15px_rgba(255,184,108,0.2)]'
                                : 'text-muted-text hover:text-white hover:bg-white/5'
                                } ${(!hasGraph || generating3D) ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                            {generating3D ? (
                                <><span className="w-4 h-4 border-2 border-status-warning/30 border-t-status-warning rounded-full animate-spin mr-2" /> Compiling...</>
                            ) : (
                                <><Box size={16} className="mr-2" /> 3D View</>
                            )}
                            {modelSpec && <span className="ml-2 w-1.5 h-1.5 bg-status-warning rounded-full shadow-[0_0_5px_rgba(255,184,108,0.8)]"></span>}
                        </button>

                        <button
                            onClick={() => setViewMode('device')}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'device'
                                ? 'bg-accent-cyan/20 text-accent-cyan shadow-[0_0_15px_rgba(97,218,251,0.2)]'
                                : 'text-muted-text hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Cpu size={16} className="mr-2" /> Static Presets
                        </button>
                    </div>

                    {/* Presets selector */}
                    <AnimatePresence mode="popLayout">
                        {viewMode === 'device' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                                className="flex space-x-2"
                            >
                                {FALLBACK_DEVICES.map(d => (
                                    <PrimaryButton
                                        key={d.id}
                                        variant={selectedDevice === d.id ? 'primary' : 'ghost'}
                                        onClick={() => setSelectedDevice(d.id)}
                                        icon={d.icon}
                                        className={`text-xs px-3 py-1.5 ${selectedDevice === d.id ? 'shadow-[0_0_10px_rgba(97,218,251,0.3)]' : 'hover:bg-white/5'}`}
                                    >
                                        {d.name}
                                    </PrimaryButton>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Main Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[600px]">

                    {/* Left Data/Telemetry Panel */}
                    <div className="col-span-1 flex flex-col space-y-6">
                        {/* Topology Legend */}
                        <AnimatePresence>
                            {viewMode === 'graph' && hasGraph && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <GlassCard className="p-5">
                                        <h3 className="text-[10px] font-bold text-muted-text uppercase tracking-widest mb-4 flex items-center">
                                            <Network className="w-3 h-3 mr-2" /> Topology Legend
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            {[
                                                { shape: '■', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10 border-accent-cyan/30', label: 'Component (Box)' },
                                                { shape: '●', color: 'text-accent-pink', bg: 'bg-accent-pink/10 border-accent-pink/30', label: 'Interface (Cyl)' },
                                                { shape: '◆', color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/30', label: 'Constraint (Oct)' },
                                                { shape: '◉', color: 'text-accent-violet', bg: 'bg-accent-violet/10 border-accent-violet/30', label: 'Root System (Ico)' },
                                            ].map(({ shape, color, bg, label }) => (
                                                <div key={label} className={`flex items-center space-x-3 p-2 rounded-lg border ${bg}`}>
                                                    <span className={`${color} text-lg w-5 text-center drop-shadow-[0_0_5px_currentColor]`}>{shape}</span>
                                                    <span className="text-gray-300 text-xs font-medium tracking-wide">{label}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-5 pt-4 border-t border-glass-border">
                                            <p className="text-[10px] uppercase tracking-wider text-muted-text flex items-center">
                                                <RefreshCw className="w-3 h-3 mr-2" /> Drag: Rotate • Scroll: Zoom
                                            </p>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Baked Requirements Data */}
                        {requirements.length > 0 && (
                            <GlassCard className="p-5 flex-1 flex flex-col overflow-hidden">
                                <h3 className="text-[10px] font-bold text-muted-text uppercase tracking-widest mb-4 flex items-center shrink-0">
                                    <Layers className="w-3 h-3 mr-2" /> Baked-in Constraints
                                </h3>
                                <div className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-glass-border pr-2 flex-1 relative">
                                    {/* Gradient fade at bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-deep-graphite/90 to-transparent pointer-events-none z-10" />

                                    {requirements.map((r: any, idx: number) => (
                                        <motion.div
                                            key={r.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="text-xs p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                                        >
                                            <div className="flex items-center space-x-2 mb-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent-violet shadow-[0_0_5px_rgba(189,147,249,0.8)]" />
                                                <span className="text-accent-violet font-mono text-[10px] font-bold tracking-wider">{r.id}</span>
                                            </div>
                                            <p className="text-gray-400 leading-relaxed pl-3.5">
                                                {r.description.length > 75 ? `${r.description.substring(0, 75)}...` : r.description}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </GlassCard>
                        )}
                    </div>

                    {/* 3D Canvas Area */}
                    <GlassCard className="col-span-1 lg:col-span-3 h-full relative overflow-hidden group">

                        {/* Environmental Glow */}
                        <div className="absolute inset-x-0 -top-40 h-80 bg-accent-cyan/5 blur-[100px] pointer-events-none" />

                        {/* Canvas Status Badge overlay */}
                        <div className="absolute top-5 left-5 z-10 bg-deep-graphite/40 backdrop-blur-xl border border-glass-border px-4 py-2 rounded-xl text-xs flex items-center shadow-lg">
                            <div className="w-2 h-2 rounded-full bg-status-success animate-pulse mr-3 shadow-[0_0_8px_rgba(80,250,123,0.8)]" />
                            <span className="text-white font-medium tracking-wide">
                                {generating3D
                                    ? `Cloud Compilation Active`
                                    : viewMode === 'graph'
                                        ? `Topology Rendering`
                                        : viewMode === 'model'
                                            ? `Mesh Rendering`
                                            : `Static Preset Active`
                                }
                            </span>
                            <span className="mx-3 text-glass-border">|</span>
                            <span className="text-muted-text font-mono">
                                {viewMode === 'graph'
                                    ? `N: ${graphNodes.length} / E: ${graphEdges.length}`
                                    : viewMode === 'model'
                                        ? `${modelSpec?.parts?.length || 0} Artifacts`
                                        : `${FALLBACK_DEVICES.find(d => d.id === selectedDevice)?.name}`
                                }
                            </span>
                        </div>

                        {/* Action corner overlay */}
                        {viewMode === 'model' && (
                            <PrimaryButton
                                variant="secondary"
                                onClick={handleGenerate3D}
                                disabled={generating3D}
                                icon={<RefreshCw size={14} className={generating3D ? "animate-spin" : ""} />}
                                className="absolute bottom-5 right-5 z-20 text-xs shadow-xl backdrop-blur-xl bg-deep-graphite/80"
                            >
                                {generating3D ? 'Recompiling Mesh...' : 'Recompile Mesh'}
                            </PrimaryButton>
                        )}

                        {/* Viewport content */}
                        <div className="absolute inset-0 z-0">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={viewMode + selectedDevice}
                                    initial={{ opacity: 0, filter: 'blur(10px)', scale: 1.05 }}
                                    animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                                    exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
                                    transition={{ duration: 0.5 }}
                                    className="w-full h-full"
                                >
                                    {generating3D ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-deep-graphite/40 backdrop-blur-sm rounded-xl z-20">
                                            <div className="w-12 h-12 border-2 border-status-warning border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(255,184,108,0.5)]" />
                                            <p className="text-status-warning font-mono text-xs uppercase tracking-widest font-bold">Compiling 3D Mesh...</p>
                                            <p className="text-gray-400 text-[10px] mt-2 max-w-xs text-center italic">This may take upto 5mins</p>
                                        </div>
                                    ) : viewMode === 'graph' ? (
                                        <DynamicGraphViewer
                                            nodes={graphNodes}
                                            edges={graphEdges}
                                            deviceName={activeProject?.name}
                                        />
                                    ) : viewMode === 'model' && modelSpec ? (
                                        <DeviceModelViewer modelSpec={modelSpec} />
                                    ) : (
                                        <DeviceTwinViewer deviceType={selectedDevice} />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Canvas Vignette */}
                        <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_0_100px_rgba(11,15,20,0.8)] mix-blend-multiply border border-white/5" />
                    </GlassCard>
                </div>
            </div>
        </Layout>
    );
}
