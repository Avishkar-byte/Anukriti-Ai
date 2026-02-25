"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { useProject, GraphNode, GraphEdge } from '../context/ProjectContext';
import GlassCard from '../components/ui/GlassCard';
import PrimaryButton from '../components/ui/PrimaryButton';
import { Network, X, Layers, Maximize2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const DynamicGraphViewer = dynamic(() => import('../components/DynamicGraphViewer'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex flex-col items-center justify-center bg-deep-graphite/40 backdrop-blur-sm">
            <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-accent-cyan font-mono text-xs uppercase tracking-widest">Rendering Topology Map...</p>
        </div>
    )
});

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    'Component': { bg: 'bg-accent-cyan/10', border: 'border-accent-cyan/30', text: 'text-accent-cyan' },
    'Interface': { bg: 'bg-accent-violet/10', border: 'border-accent-violet/30', text: 'text-accent-violet' },
    'Constraint': { bg: 'bg-status-error/10', border: 'border-status-error/30', text: 'text-status-error' },
    'Input': { bg: 'bg-status-success/10', border: 'border-status-success/30', text: 'text-status-success' },
    'Output': { bg: 'bg-status-warning/10', border: 'border-status-warning/30', text: 'text-status-warning' },
};

export default function Architecture() {
    const { activeProject, buildGraph, loading } = useProject();
    const [graphData, setGraphData] = useState<any>(activeProject?.graph || null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

    useEffect(() => {
        if (activeProject?.graph && !graphData) {
            setGraphData(activeProject.graph);
        }
    }, [activeProject]);

    const handleBuildGraph = async () => {
        if (!activeProject) {
            alert("Please select or create a project first.");
            return;
        }
        if (!activeProject.requirements) {
            alert("Generate requirements first.");
            return;
        }
        const data = await buildGraph();
        if (data) setGraphData(data);
    };

    const nodes: GraphNode[] = graphData?.nodes || [];
    const edges: GraphEdge[] = graphData?.edges || [];
    const components = nodes.filter(n => n.type === 'Component' && n.id !== 'SYS_ROOT');
    const interfaces = nodes.filter(n => n.type === 'Interface');
    const constraints = nodes.filter(n => n.type === 'Constraint');

    return (
        <Layout>
            <div className="flex min-h-full max-w-[1400px] mx-auto relative overflow-visible pt-4 pb-12">
                <div className="flex-1 space-y-6 flex flex-col min-w-0 pr-4">
                    <header className="flex justify-between items-end mb-4">
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                                Architecture Graph
                            </h1>
                            <p className="text-muted-text mt-2 text-sm">
                                {activeProject ? `Project: ${activeProject.name}` : 'No project selected'}
                            </p>
                        </div>
                        <PrimaryButton
                            onClick={handleBuildGraph}
                            disabled={loading || !activeProject?.requirements}
                            icon={loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" /> : <Network className="w-4 h-4" />}
                            className={loading || !activeProject?.requirements ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            {loading ? 'Building Engine...' : (graphData ? 'Rebuild Graph' : 'Generate Architecture')}
                        </PrimaryButton>
                    </header>

                    {!activeProject?.requirements && (
                        <GlassCard className="p-4 border-status-warning/40 bg-status-warning/5">
                            <p className="text-sm text-status-warning flex items-center">
                                <span className="mr-2">⚠️</span> Complete the Requirements step first to build the graph.
                            </p>
                        </GlassCard>
                    )}

                    {graphData ? (
                        <>
                            {/* Stats */}
                            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none">
                                {[
                                    { label: 'Total Nodes', value: nodes.length },
                                    { label: 'Subsystems', value: components.length },
                                    { label: 'Interfaces', value: interfaces.length },
                                    { label: 'Edges', value: edges.length },
                                ].map(({ label, value }) => (
                                    <GlassCard key={label} className="px-5 py-3 min-w-[120px]">
                                        <div className="text-xs text-muted-text mb-1 uppercase tracking-widest">{label}</div>
                                        <div className="text-xl font-bold text-white">{value}</div>
                                    </GlassCard>
                                ))}
                            </div>

                            {/* Topology Visualization Canvas */}
                            <GlassCard className="flex-1 min-h-[500px] relative overflow-hidden flex flex-col p-8">
                                <div className="absolute inset-0 opacity-10 pointer-events-none"
                                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                                {/* Mode Toggles - Floating Top Center */}
                                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex bg-deep-graphite/80 backdrop-blur-md rounded-full p-1 border border-glass-border shadow-lg z-10">
                                    <button
                                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${viewMode === '2d' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-text hover:text-white'}`}
                                        onClick={() => setViewMode('2d')}
                                    >
                                        2D Matrix
                                    </button>
                                    <button
                                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${viewMode === '3d' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-text hover:text-white'}`}
                                        onClick={() => setViewMode('3d')}
                                    >
                                        3D Graph
                                    </button>
                                </div>

                                {viewMode === '2d' ? (
                                    <div className="relative flex-1 flex flex-col items-center justify-center space-y-12 py-10 z-0">
                                        {/* Root Node */}
                                        <motion.div
                                            whileHover={{ y: -5, scale: 1.05 }}
                                            className="px-6 py-4 bg-accent-cyan/20 border border-accent-cyan/50 rounded-2xl text-center backdrop-blur shadow-[0_0_30px_rgba(97,218,251,0.15)] cursor-pointer"
                                        >
                                            <div className="text-[10px] text-accent-cyan font-bold tracking-widest uppercase mb-1">Root System</div>
                                            <div className="text-white font-semibold text-lg">{nodes.find(n => n.id === 'SYS_ROOT')?.label || 'System'}</div>
                                        </motion.div>

                                        {/* Connection Line */}
                                        <div className="w-px h-12 bg-gradient-to-b from-accent-cyan/50 to-transparent" />

                                        {/* Subsystems Cloud */}
                                        <div className="w-full max-w-4xl">
                                            <div className="text-[10px] text-muted-text text-center uppercase tracking-widest mb-6 divider">Component Entities</div>
                                            <div className="flex flex-wrap justify-center gap-4">
                                                {components.map(node => {
                                                    const colors = NODE_COLORS[node.type] || NODE_COLORS['Component'];
                                                    const isSelected = selectedNode?.id === node.id;
                                                    return (
                                                        <motion.div
                                                            key={node.id}
                                                            onClick={() => setSelectedNode(node)}
                                                            layoutId={`node-${node.id}`}
                                                            whileHover={{ y: -6, scale: 1.02 }}
                                                            className={`px-5 py-4 ${colors.bg} border ${isSelected ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : colors.border} rounded-xl text-center backdrop-blur cursor-pointer transition-colors relative min-w-[160px]`}
                                                        >
                                                            <div className={`text-[10px] ${colors.text} font-bold mb-1.5 uppercase tracking-wider`}>{node.type}</div>
                                                            <div className="text-white text-sm font-medium">{node.label}</div>
                                                            {node.trace_req_ids?.length > 0 && (
                                                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-deep-graphite border border-glass-border rounded-full flex items-center justify-center text-[10px] text-muted-text">
                                                                    {node.trace_req_ids.length}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 mt-20 pb-4 flex flex-col items-center justify-center z-0">
                                        <DynamicGraphViewer nodes={nodes} edges={edges} />
                                    </div>
                                )}
                            </GlassCard>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <GlassCard className="flex flex-col items-center justify-center p-16 text-center opacity-50 w-full max-w-2xl">
                                <div className="w-20 h-20 rounded-full border border-dashed border-white/20 flex items-center justify-center mb-6">
                                    <Network className="w-8 h-8 text-muted-text" />
                                </div>
                                <p className="text-xl text-white font-medium mb-2">No Architecture Generated</p>
                                <p className="text-sm text-muted-text max-w-md">Click the generate button above to command the LLM to architect a system graph based on your requirements.</p>
                            </GlassCard>
                        </div>
                    )}
                </div>

                {/* Sliding Side Detail Panel */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            initial={{ x: 400, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 400, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-[360px] flex-shrink-0 h-full pl-4"
                        >
                            <GlassCard className="h-full flex flex-col relative overflow-hidden">
                                {/* Top Glow */}
                                <div className={`absolute top-0 left-0 right-0 h-1 ${NODE_COLORS[selectedNode.type]?.bg.replace('/10', '/50') || 'bg-white/20'}`} />

                                <div className="p-6 border-b border-glass-border flex justify-between items-start">
                                    <div>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${NODE_COLORS[selectedNode.type]?.text || 'text-white'}`}>
                                            {selectedNode.type}
                                        </p>
                                        <h3 className="text-xl font-bold text-white mt-1">{selectedNode.label}</h3>
                                        <p className="text-xs font-mono text-muted-text mt-2">{selectedNode.id}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedNode(null)}
                                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-muted-text hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-glass-border">
                                    {/* Parameters */}
                                    {selectedNode.parameters && Object.keys(selectedNode.parameters).length > 0 && (
                                        <div>
                                            <h4 className="text-xs text-muted-text font-bold uppercase tracking-wider mb-3">Parameters</h4>
                                            <div className="space-y-2">
                                                {Object.entries(selectedNode.parameters).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between items-center text-sm p-2 bg-deep-graphite/50 rounded-lg border border-white/5">
                                                        <span className="text-gray-400 font-mono text-[11px]">{k}</span>
                                                        <span className="text-accent-cyan font-bold">{v as string}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Connected Edges */}
                                    <div>
                                        <h4 className="text-xs text-muted-text font-bold uppercase tracking-wider mb-3">Connections</h4>
                                        <div className="space-y-2">
                                            {edges
                                                .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                                                .map(e => {
                                                    const isSource = e.source === selectedNode.id;
                                                    const otherNodeId = isSource ? e.target : e.source;
                                                    const otherNode = nodes.find(n => n.id === otherNodeId);
                                                    return (
                                                        <div key={e.id} className="p-3 bg-white/5 rounded-xl border border-white/5 text-sm">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] uppercase tracking-wider text-muted-text">{e.type} edge</span>
                                                                <span className="text-xs text-accent-violet flex items-center">
                                                                    {isSource ? 'Out →' : '← In'}
                                                                </span>
                                                            </div>
                                                            <p className="text-white font-medium text-xs truncate">
                                                                {otherNode?.label || otherNodeId}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>

                                    {/* Traceability */}
                                    {selectedNode.trace_req_ids && selectedNode.trace_req_ids.length > 0 && (
                                        <div>
                                            <h4 className="text-xs text-muted-text font-bold uppercase tracking-wider mb-3 flex items-center">
                                                <Layers size={14} className="mr-2" /> Traceability Specs
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedNode.trace_req_ids.map(rid => (
                                                    <span key={rid} className="px-2.5 py-1.5 bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 rounded-lg text-xs font-mono hover:bg-accent-cyan/20 cursor-pointer transition-colors">
                                                        {rid}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
}
