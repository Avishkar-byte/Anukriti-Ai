"use client";
import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import NewProjectModal from './NewProjectModal';
import StepRail from './StepRail';
import PrimaryButton from './ui/PrimaryButton';
import OnboardingTour from './OnboardingTour';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { activeProject, projects, setActiveProject } = useProject();
    const [showNewProject, setShowNewProject] = useState(false);

    return (
        <div className="flex h-screen bg-deep-graphite text-neutral-text font-sans overflow-hidden">
            {/* Step Rail Navigation */}
            <StepRail />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-[url('/grid.svg')] md:ml-64 relative bg-opacity-50">
                {/* Top Bar */}
                <header className="h-20 flex items-center justify-end md:justify-between px-4 md:px-8 shrink-0 z-30 pointer-events-none mt-2">
                    <div className="hidden md:flex items-center space-x-4 pointer-events-auto">
                        {/* Project Selector (always show so tour can target it) */}
                        <div className="tour-step-2-projects bg-glass backdrop-blur-md border border-glass-border rounded-xl shadow-lg hover:border-white/20 transition-colors">
                            <select
                                value={activeProject?.project_id || ''}
                                onChange={(e) => {
                                    const p = projects.find(p => p.project_id === e.target.value);
                                    if (p) setActiveProject(p);
                                }}
                                disabled={projects.length === 0}
                                className="bg-transparent px-4 py-2 text-sm text-white outline-none cursor-pointer appearance-none min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {projects.length === 0 ? (
                                    <option value="" className="bg-deep-graphite">No projects available</option>
                                ) : (
                                    <>
                                        <option value="" className="bg-deep-graphite">Select Project...</option>
                                        {projects.map((p: any) => (
                                            <option key={p.project_id} value={p.project_id} className="bg-deep-graphite">{p.name}</option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4 pointer-events-auto relative z-40">
                        <PrimaryButton
                            variant="solid"
                            onClick={() => setShowNewProject(true)}
                            className="tour-step-1-new-twin text-sm shadow-xl"
                        >
                            + New Digital Twin
                        </PrimaryButton>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-glass-border">
                    {children}
                </div>
            </main>

            {/* Modals & Overlays */}
            <OnboardingTour />
            <NewProjectModal isOpen={showNewProject} onClose={() => setShowNewProject(false)} />
        </div>
    );
}

