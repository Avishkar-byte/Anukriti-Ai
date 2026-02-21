"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { useProject, Requirement } from '../context/ProjectContext';
import GlassCard from '../components/ui/GlassCard';
import PrimaryButton from '../components/ui/PrimaryButton';
import { Search, Sparkles, Layers } from 'lucide-react';

export default function Requirements() {
    const { activeProject, generateRequirements, loading } = useProject();
    const [intent, setIntent] = useState('');
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>('All');

    const handleGenerate = async () => {
        if (!activeProject) {
            alert("Please create or select a project first.");
            return;
        }
        const useIntent = intent.trim() || activeProject.device_description;
        const reqs = await generateRequirements(useIntent);
        if (reqs) setRequirements(reqs);
    };

    const displayReqs = requirements.length > 0
        ? requirements
        : (activeProject?.requirements?.requirements || []);

    const categoryColors: Record<string, string> = {
        'System': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Hardware': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        'Software': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        'Electrical': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        'Safety': 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    // Filter logic
    const uniqueCategories = ['All', ...Array.from(new Set(displayReqs.map((r: Requirement) => r.category)))];
    const filteredReqs = activeFilter === 'All'
        ? displayReqs
        : displayReqs.filter((r: Requirement) => r.category === activeFilter);

    return (
        <Layout>
            <div className="max-w-5xl mx-auto space-y-8">
                <header className="mb-2">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Requirement Intelligence
                    </h1>
                    <p className="text-muted-text mt-2 text-sm">
                        {activeProject
                            ? `Project: ${activeProject.name}`
                            : 'No project selected — create one first'}
                    </p>
                </header>

                {/* Input Area */}
                <GlassCard className="p-6">
                    <label className="text-sm font-medium text-muted-text mb-3 flex items-center">
                        <Sparkles className="w-4 h-4 mr-2 text-accent-cyan" />
                        Describe your Medical Device Intent
                    </label>
                    <textarea
                        className="w-full bg-deep-graphite/50 border border-glass-border rounded-xl p-4 text-white focus:ring-1 focus:ring-accent-cyan outline-none h-32 placeholder-muted-text/50 resize-none transition-shadow hover:shadow-[0_0_15px_rgba(255,255,255,0.02)] block"
                        placeholder={activeProject
                            ? `Default: "${activeProject.device_description.substring(0, 80)}..." — or type a custom description`
                            : "e.g. A portable insulin pump with 3-day battery life and occlusion detection..."
                        }
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                    />
                    <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                        <p className="text-xs text-muted-text/70 flex items-center">
                            Powered by Groq LLM (LLaMA 3.1) <span className="mx-2">•</span> Extracts ISO/IEC compliant requirements
                        </p>
                        <PrimaryButton
                            onClick={handleGenerate}
                            disabled={loading || !activeProject}
                            icon={loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" /> : <Sparkles size={16} />}
                            className={loading || !activeProject ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            {loading ? 'Analyzing...' : 'Generate Requirements'}
                        </PrimaryButton>
                    </div>
                </GlassCard>

                {/* Filters Area */}
                {displayReqs.length > 0 && (
                    <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none">
                        <Search className="w-4 h-4 text-muted-text flex-shrink-0 mr-2" />
                        {uniqueCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveFilter(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all flex-shrink-0 ${activeFilter === cat
                                        ? 'bg-accent-violet/20 border-accent-violet/50 text-accent-violet shadow-[0_0_10px_rgba(155,124,255,0.2)]'
                                        : 'bg-glass border-glass-border text-muted-text hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                {cat}
                                {cat !== 'All' && <span className="ml-2 opacity-50">
                                    {displayReqs.filter((r: Requirement) => r.category === cat).length}
                                </span>}
                            </button>
                        ))}
                    </div>
                )}

                {/* Results Grid */}
                {displayReqs.length > 0 && (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        layout
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredReqs.map((req: Requirement, idx: number) => (
                                <GlassCard
                                    key={`${req.id}-${idx}`}
                                    hoverLift
                                    className="p-5 flex flex-col cursor-crosshair group"
                                    layout
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.5) }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`px-2.5 py-1 rounded-md border text-[10px] font-bold tracking-wider uppercase ${categoryColors[req.category] || 'bg-white/5 text-gray-400 border-white/10'}`}>
                                            {req.id}
                                        </div>
                                        <span className={`text-[10px] px-2 py-1 rounded-md border uppercase tracking-widest ${req.safety_class === 'C' ? 'bg-status-error/10 text-status-error border-status-error/20' :
                                                req.safety_class === 'B' ? 'bg-status-warning/10 text-status-warning border-status-warning/20' :
                                                    'bg-status-success/10 text-status-success border-status-success/20'
                                            }`}>
                                            Class {req.safety_class}
                                        </span>
                                    </div>

                                    <p className="text-gray-200 text-sm leading-relaxed mb-4 flex-1 group-hover:text-white transition-colors">
                                        {req.description}
                                    </p>

                                    <div className="mt-auto border-t border-glass-border pt-4">
                                        <div className="flex flex-wrap gap-2">
                                            {req.constraints.map((c, i) => (
                                                <span key={i} className="text-[10px] bg-deep-graphite px-2 py-1 rounded-md text-muted-text border border-white/5 flex items-center">
                                                    <span className="text-white/40 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">↳</span>
                                                    <span className="font-mono text-white/80 mr-1">{c.description}:</span>
                                                    <span className="text-accent-cyan font-bold">
                                                        {c.value ?? 'N/A'} {c.unit ?? ''} {c.tolerance ? `±${c.tolerance}` : ''}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-3 text-[10px] text-muted-text/50 flex items-center">
                                            <span className="group-hover:text-accent-violet transition-colors">📄 {req.source_document}</span>
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Empty state */}
                {displayReqs.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center mb-4">
                            <Layers className="w-6 h-6 text-muted-text" />
                        </div>
                        <p className="text-lg text-white font-medium mb-1">No Requirements Yet</p>
                        <p className="text-sm text-muted-text max-w-sm">Describe a medical device above and let the AI generate a formal structured requirements document.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
