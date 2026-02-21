"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useProject } from '../context/ProjectContext';
import { Layers, GitCommit, Activity, Cpu, Hexagon } from 'lucide-react';

const STEPS = [
    { id: 'dashboard', path: '/', label: 'Overview', icon: <Hexagon size={18} /> },
    { id: 'requirements', path: '/requirements', label: 'Requirements', icon: <Layers size={18} /> },
    { id: 'architecture', path: '/architecture', label: 'Architecture', icon: <GitCommit size={18} /> },
    { id: 'simulation', path: '/simulation', label: 'Simulation & ML Twin', icon: <Activity size={18} /> },
    { id: 'digital-twins', path: '/digital-twins', label: '3D Modeler', icon: <Cpu size={18} /> },
];

export default function StepRail() {
    const pathname = usePathname();
    const router = useRouter();
    const { activeProject } = useProject();

    return (
        <div className="w-64 h-screen border-r border-glass-border bg-glass backdrop-blur-xl flex flex-col p-4 flex-shrink-0 z-40 fixed left-0 top-0">
            {/* Header / Brand */}
            <div className="mb-10 px-2 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-violet to-accent-cyan flex flex-shrink-0 items-center justify-center shadow-lg shadow-accent-cyan/20">
                    <span className="text-white font-bold text-lg">A</span>
                </div>
                <div>
                    <h1 className="text-white font-bold tracking-wide">Anukriti</h1>
                    <p className="text-[10px] text-accent-cyan uppercase tracking-widest font-mono">Digital Twin OS</p>
                </div>
            </div>

            {/* Project Info */}
            <div className="mb-8 p-3 rounded-xl bg-white/5 border border-white/5 shadow-inner">
                <p className="text-xs text-muted-text mb-1 uppercase tracking-wider font-semibold">Active Project</p>
                {activeProject ? (
                    <p className="text-sm text-white font-medium truncate">{activeProject.name}</p>
                ) : (
                    <p className="text-sm text-status-warning italic">No project selected</p>
                )}
            </div>

            {/* Navigation Steps */}
            <nav className="flex-1 space-y-2 relative">
                {/* Connecting line */}
                <div className="absolute left-6 top-6 bottom-6 w-px bg-glass-border -z-10" />

                {STEPS.map((step, index) => {
                    const isActive = pathname === step.path;

                    return (
                        <motion.button
                            key={step.id}
                            onClick={() => router.push(step.path)}
                            whileHover={{ scale: 1.02, x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full text-left flex items-center p-3 rounded-2xl transition-colors relative group ${isActive ? 'bg-white/5 border border-white/10 shadow-lg' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            {/* Node dot connection */}
                            <div className={`w-3 h-3 rounded-full border-2 mr-3 flex-shrink-0 transition-colors ${isActive ? 'border-accent-cyan bg-accent-cyan/20 shadow-[0_0_10px_rgba(97,218,251,0.5)]' : 'border-muted-text bg-deep-graphite group-hover:border-white'}`} />

                            <div className="flex-1 min-w-0 flex items-center space-x-3">
                                <span className={`${isActive ? 'text-accent-cyan' : 'text-muted-text group-hover:text-white'}`}>
                                    {step.icon}
                                </span>
                                <div>
                                    <div className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-muted-text group-hover:text-white'}`}>
                                        {step.label}
                                    </div>
                                    <div className="text-[10px] text-muted-text mt-0.5">Step {index + 1}</div>
                                </div>
                            </div>

                            {/* Active edge highlight */}
                            {isActive && (
                                <motion.div
                                    layoutId="active-step-highlight"
                                    className="absolute inset-0 rounded-2xl border border-accent-cyan/30 pointer-events-none"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </nav>

            <div className="mt-auto pt-4 pb-6 border-t border-glass-border">
                <div className="flex items-center text-xs text-muted-text px-2">
                    <span className="w-2 h-2 rounded-full bg-status-success mr-2 animate-pulse" />
                    Engine Backend Connected
                </div>
            </div>
        </div>
    );
}
