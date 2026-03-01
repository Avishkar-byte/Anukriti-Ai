"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Ensure NEXT_PUBLIC_API_URL does not have a trailing slash
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003').replace(/\/$/, '');

// ─── Types ───────────────────────────────
export interface Constraint {
    description: string;
    value: number | null;
    unit: string | null;
    tolerance: number | null;
}

export interface Requirement {
    id: string;
    description: string;
    category: string;
    safety_class: string;
    constraints: Constraint[];
    source_document: string;
    trace_ids: string[];
}

export interface GraphNode {
    id: string;
    type: string;
    label: string;
    properties: Record<string, any>;
    parameters?: Record<string, any>;
    trace_req_ids: string[];
}

export interface GraphEdge {
    id: string;
    type: string;
    source: string;
    target: string;
    relation: string;
}

export interface Project {
    project_id: string;
    name: string;
    device_description: string;
    status: string;
    requirements: { requirements: Requirement[] } | null;
    graph: { nodes: GraphNode[]; edges: GraphEdge[] } | null;
    simulation: any;
    twin: any;
    model_3d: any;
    compliance: any;
}

export interface Stats {
    active_projects: number;
    total_requirements: number;
    simulations_run: number;
    active_twins: number;
}

interface ProjectContextType {
    // State
    projects: Project[];
    activeProject: Project | null;
    stats: Stats;
    loading: boolean;
    coreOnline: boolean;

    // Actions
    createProject: (name: string, description: string) => Promise<Project | null>;
    setActiveProject: (project: Project) => void;
    generateRequirements: (intent: string) => Promise<Requirement[] | null>;
    buildGraph: () => Promise<any>;
    runSimulation: () => Promise<any>;
    runWhatIfSimulation: (overrides: Record<string, any>) => Promise<any>;
    trainTwin: () => Promise<any>;
    generate3DModel: () => Promise<any>;
    checkCompliance: () => Promise<any>;
    refreshProjects: () => Promise<void>;
    refreshStats: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function useProject() {
    const ctx = useContext(ProjectContext);
    if (!ctx) throw new Error("useProject must be inside ProjectProvider");
    return ctx;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProjectState] = useState<Project | null>(null);
    const [stats, setStats] = useState<Stats>({
        active_projects: 0, total_requirements: 0, simulations_run: 0, active_twins: 0
    });
    const [loading, setLoading] = useState(false);
    const [coreOnline, setCoreOnline] = useState(false);

    // ─── Health Check ─────────────────────
    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(3000) });
                if (res.ok) setCoreOnline(true);
            } catch { setCoreOnline(false); }
        };
        check();
        const interval = setInterval(check, 15000);
        return () => clearInterval(interval);
    }, []);

    // ─── Load on mount ────────────────────
    useEffect(() => {
        if (coreOnline) {
            refreshProjects();
            refreshStats();
        }
    }, [coreOnline]);

    // ─── Actions ──────────────────────────
    const refreshProjects = async () => {
        try {
            const res = await fetch(`${API_BASE}/projects`);
            if (res.ok) {
                const data = await res.json();
                setProjects(Array.isArray(data) ? data : []);
            } else {
                setProjects([]);
            }
        } catch {
            setProjects([]);
        }
    };

    const refreshStats = async () => {
        try {
            const res = await fetch(`${API_BASE}/system/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch { }
    };

    const setActiveProject = (project: Project) => {
        setActiveProjectState(project);
    };

    const refreshActiveProject = async (projectId: string) => {
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}`);
            const data = await res.json();
            setActiveProjectState(data);
            await refreshProjects();
            await refreshStats();
            return data;
        } catch { return null; }
    };

    const createProject = async (name: string, description: string): Promise<Project | null> => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/projects/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, device_description: description })
            });
            const project = await res.json();
            setActiveProjectState(project);
            await refreshProjects();
            await refreshStats();
            return project;
        } catch { return null; }
        finally { setLoading(false); }
    };

    const generateRequirements = async (intent: string): Promise<Requirement[] | null> => {
        if (!activeProject) return null;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/workflow/generate-requirements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: activeProject.project_id,
                    device_name: activeProject.name,
                    user_intent: intent
                })
            });
            const data = await res.json();
            const updated = await refreshActiveProject(activeProject.project_id);
            return data.requirements || [];
        } catch { return null; }
        finally { setLoading(false); }
    };

    const checkCompliance = async () => {
        if (!activeProject?.requirements) return null;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/workflow/check-compliance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeProject.requirements)
            });
            const data = await res.json();
            await refreshActiveProject(activeProject.project_id);
            return data;
        } catch { return null; }
        finally { setLoading(false); }
    };

    const buildGraph = async () => {
        if (!activeProject?.requirements) return null;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/workflow/build-graph`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeProject.requirements)
            });
            const data = await res.json();
            await refreshActiveProject(activeProject.project_id);
            return data;
        } catch { return null; }
        finally { setLoading(false); }
    };

    const runSimulation = async () => {
        if (!activeProject?.requirements) return null;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/workflow/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeProject.requirements)
            });
            const data = await res.json();
            await refreshActiveProject(activeProject.project_id);
            return data;
        } catch { return null; }
        finally { setLoading(false); }
    };

    const runWhatIfSimulation = async (overrides: Record<string, any>) => {
        if (!activeProject?.requirements) return null;
        setLoading(true);
        try {
            const payload = {
                project_id: activeProject.project_id,
                device_name: activeProject.name,
                requirements: activeProject.requirements.requirements || activeProject.requirements,
                overrides
            };
            const res = await fetch(`${API_BASE}/workflow/simulate-whatif`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            await refreshActiveProject(activeProject.project_id);
            return data;
        } catch { return null; }
        finally { setLoading(false); }
    };

    const trainTwin = async () => {
        if (!activeProject?.requirements) return null;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/workflow/train-twin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeProject.requirements)
            });
            const data = await res.json();
            await refreshActiveProject(activeProject.project_id);
            return data;
        } catch { return null; }
        finally { setLoading(false); }
    };

    const generate3DModel = async () => {
        if (!activeProject?.graph) return null;
        setLoading(true);
        try {
            let isPolling = true;
            let resultData = null;

            while (isPolling) {
                const res = await fetch(`${API_BASE}/workflow/generate-3d-model`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project_id: activeProject.project_id,
                        device_name: activeProject.name,
                        requirements: activeProject.requirements?.requirements || []
                    })
                });

                const data = await res.json();

                if (data?.status === "processing") {
                    // Wait for 5 seconds before checking again
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue; // Loop again
                }

                resultData = data;
                isPolling = false; // Stop polling
            }

            await refreshActiveProject(activeProject.project_id);
            return resultData;
        } catch {
            return null;
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProjectContext.Provider value={{
            projects, activeProject, stats, loading, coreOnline,
            createProject, setActiveProject, generateRequirements,
            buildGraph, runSimulation, runWhatIfSimulation, trainTwin, generate3DModel, checkCompliance, refreshProjects, refreshStats
        }}>
            {children}
        </ProjectContext.Provider>
    );
}
