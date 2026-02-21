"use client";
import { motion, AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import { useProject } from './context/ProjectContext';
import GlassCard from './components/ui/GlassCard';
import {
  FolderPlus,
  FileText,
  Network,
  BrainCircuit,
  Activity,
  Zap,
  Server,
  CheckCircle2,
  CircleDashed,
  Cpu,
  TrendingUp,
  Play,
  Terminal
} from 'lucide-react';

const StatCard = ({ title, value, trend, color, icon: Icon, delay = 0 }: any) => {
  // Generate color classes based on the passed color prop
  const colorStylesMap = {
    cyan: { text: 'text-accent-cyan', bg: 'bg-accent-cyan/10', glow: 'shadow-[0_0_15px_rgba(97,218,251,0.2)]' },
    violet: { text: 'text-accent-violet', bg: 'bg-accent-violet/10', glow: 'shadow-[0_0_15px_rgba(189,147,249,0.2)]' },
    success: { text: 'text-status-success', bg: 'bg-status-success/10', glow: 'shadow-[0_0_15px_rgba(80,250,123,0.2)]' },
    warning: { text: 'text-status-warning', bg: 'bg-status-warning/10', glow: 'shadow-[0_0_15px_rgba(255,184,108,0.2)]' },
  };
  const colorStyles = colorStylesMap[color as keyof typeof colorStylesMap] || colorStylesMap.cyan;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, duration: 0.3 }}>
      <GlassCard hoverLift className="p-6 relative overflow-hidden group">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl transition-all opacity-40 group-hover:opacity-60 ${colorStyles.bg}`} />

        <div className="flex justify-between items-start mb-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-text">{title}</p>
          <div className={`p-2 rounded-lg ${colorStyles.bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${colorStyles.text}`} />
          </div>
        </div>

        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold tracking-tight text-white">{value}</span>
          <span className={`text-[10px] font-mono px-2 py-1 flex items-center rounded-md border border-white/5 ${colorStyles.bg} ${colorStyles.text}`}>
            {trend === 'Live' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1" />}
            {trend}
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
};

const statusSteps = [
  { key: 'created', label: 'Project Init', icon: FolderPlus },
  { key: 'requirements_generated', label: 'Requirements', icon: FileText },
  { key: 'architecture_built', label: 'Topology', icon: Network },
  { key: 'twin_trained', label: 'Surrogate Twin', icon: BrainCircuit },
];

export default function Home() {
  const { stats, projects, activeProject, coreOnline } = useProject();

  const getStatusIndex = (status: string) => {
    const idx = statusSteps.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8 relative">

        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/4 w-1/2 h-64 bg-accent-cyan/5 blur-[120px] pointer-events-none rounded-full" />

        <header className="flex flex-col md:flex-row md:items-end justify-between relative z-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Command Center
            </h1>
            <p className="flex items-center text-muted-text mt-2 text-sm">
              {coreOnline ? (
                <><span className="w-2 h-2 rounded-full bg-status-success shadow-[0_0_8px_rgba(80,250,123,0.8)] mr-2 animate-pulse" /> Core Gateway Connected</>
              ) : (
                <><span className="w-2 h-2 rounded-full bg-status-error shadow-[0_0_8px_rgba(255,85,85,0.8)] mr-2" /> Connection Refused</>
              )}
            </p>
          </div>

          <div className="bg-deep-graphite/40 border border-white/5 rounded-xl px-4 py-2 flex items-center space-x-6 backdrop-blur-md">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-muted-text font-bold">Latency</span>
              <span className="text-xs font-mono text-status-success font-medium flex items-center"><Activity className="w-3 h-3 mr-1" /> 12ms</span>
            </div>
            <div className="w-px h-6 bg-glass-border" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-muted-text font-bold">Node</span>
              <span className="text-xs font-mono text-accent-cyan font-medium flex items-center"><Server className="w-3 h-3 mr-1" /> alpha-01</span>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          <StatCard title="Active Projects" value={stats.active_projects} trend="Live" color="cyan" icon={FolderPlus} delay={0.1} />
          <StatCard title="Constraint Nodes" value={stats.total_requirements} trend="+AI Extracted" color="violet" icon={FileText} delay={0.2} />
          <StatCard title="Simulations Run" value={stats.simulations_run} trend="Compute Bound" color="warning" icon={Cpu} delay={0.3} />
          <StatCard title="Surrogate Models" value={stats.active_twins} trend={stats.active_twins > 0 ? 'Optimal' : 'Offline'} color="success" icon={BrainCircuit} delay={0.4} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">

          {/* Projects List */}
          <GlassCard className="xl:col-span-2 p-6 flex flex-col h-full min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center">
                <Activity className="w-4 h-4 mr-2 text-accent-cyan" /> Project Registry
              </h3>
              <span className="text-[10px] font-mono bg-deep-graphite px-2 py-1 rounded text-muted-text border border-white/5">{projects.length} INSTANCES</span>
            </div>

            {Array.isArray(projects) && projects.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <FolderPlus className="w-16 h-16 text-muted-text mb-4 opacity-50 stroke-1" />
                <p className="text-sm text-white font-medium mb-1 tracking-wide">Registry Empty</p>
                <p className="text-[11px] text-muted-text max-w-[200px] leading-relaxed">Initialize a new digital twin project to begin data ingestion.</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-glass-border pr-2 -mr-2">
                {(Array.isArray(projects) ? projects : []).map((project: any, index: number) => {
                  const statusIdx = getStatusIndex(project.status);
                  const isActive = activeProject?.project_id === project.project_id;

                  return (
                    <motion.div
                      key={project.project_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group hover:border-white/20 ${isActive ? 'bg-accent-cyan/5 border-accent-cyan/30' : 'bg-white/[0.02] border-white/5'}`}
                    >
                      {/* Hover highlight */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-cyan shadow-[0_0_10px_rgba(97,218,251,0.5)]" />
                      )}

                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                          <h4 className={`font-bold tracking-wide flex items-center ${isActive ? 'text-white' : 'text-gray-300'}`}>
                            {project.name}
                            {isActive && <span className="ml-2 text-[9px] uppercase tracking-wider bg-accent-cyan/20 text-accent-cyan px-1.5 py-0.5 rounded border border-accent-cyan/30">Active</span>}
                          </h4>
                          <p className="text-[10px] text-muted-text font-mono mt-1">{project.project_id}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-mono px-2 py-1 rounded border capitalize flex items-center ${project.status === 'twin_trained' ? 'bg-status-success/10 text-status-success border-status-success/20' :
                            project.status === 'architecture_built' ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20' :
                              project.status === 'requirements_generated' ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' :
                                'bg-white/5 text-gray-400 border-white/10'
                            }`}>
                            {project.status === 'twin_trained' && <BrainCircuit className="w-3 h-3 mr-1" />}
                            {project.status === 'architecture_built' && <Network className="w-3 h-3 mr-1" />}
                            {project.status === 'requirements_generated' && <FileText className="w-3 h-3 mr-1" />}
                            {project.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Pipeline progress rail */}
                      <div className="relative pt-2 pb-1 z-10">
                        <div className="absolute top-1/2 left-4 right-4 h-px bg-white/5 -translate-y-1/2 z-0" />
                        <div className="flex items-center justify-between relative z-10">
                          {statusSteps.map((step, i) => {
                            const isCompleted = i <= statusIdx;
                            const isCurrent = i === statusIdx;
                            const StepIcon = step.icon;

                            return (
                              <div key={step.key} className="flex flex-col items-center flex-1 group/step">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isCurrent ? 'bg-accent-cyan shadow-[0_0_15px_rgba(97,218,251,0.5)] text-deep-graphite scale-110' :
                                  isCompleted ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30' :
                                    'bg-deep-graphite text-muted-text border border-white/10'
                                  }`}>
                                  <StepIcon className={`w-4 h-4 ${isCurrent ? 'opacity-100' : isCompleted ? 'opacity-90' : 'opacity-40'}`} />
                                </div>
                                <p className={`text-[9px] uppercase tracking-wider mt-2 font-bold whitespace-nowrap hidden sm:block ${isCurrent ? 'text-accent-cyan' : isCompleted ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  {step.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Quick Guide / Telemetry Panel */}
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-status-warning" /> Pipeline Guide
              </h3>
              <div className="relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-px before:bg-glass-border">
                {[
                  { step: '1', title: 'Initialize Artifact', desc: 'Define device specifications', icon: FolderPlus, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10', border: 'border-accent-cyan/30' },
                  { step: '2', title: 'Extract Constraints', desc: 'AI parses PDF requirements', icon: FileText, color: 'text-accent-violet', bg: 'bg-accent-violet/10', border: 'border-accent-violet/30' },
                  { step: '3', title: 'Render Topology', desc: 'Build spatial architecture', icon: Network, color: 'text-status-warning', bg: 'bg-status-warning/10', border: 'border-status-warning/30' },
                  { step: '4', title: 'Compile ML Twin', desc: 'Simulate & train surrogate', icon: BrainCircuit, color: 'text-status-success', bg: 'bg-status-success/10', border: 'border-status-success/30' },
                ].map(({ step, title, desc, icon: Icon, color, bg, border }, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (i * 0.1) }}
                    className="flex mb-6 last:mb-0 relative z-10"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border mr-4 flex-shrink-0 bg-deep-graphite backdrop-blur-sm ${border} ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="pt-1">
                      <p className="text-xs font-bold text-white tracking-wide uppercase">{title}</p>
                      <p className="text-[11px] text-muted-text mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            {/* Miniature Terminal / Log */}
            <GlassCard className="p-4 flex flex-col font-mono text-[10px] overflow-hidden group">
              <div className="flex items-center justify-between mb-3 text-muted-text border-b border-glass-border pb-2">
                <span className="uppercase tracking-widest font-bold flex items-center"><Terminal className="w-3 h-3 mr-1" /> Syslog</span>
                <span className="flex space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-error border border-white/20"></span>
                  <span className="w-2 h-2 rounded-full bg-status-warning border border-white/20"></span>
                  <span className="w-2 h-2 rounded-full bg-status-success border border-white/20"></span>
                </span>
              </div>
              <div className="space-y-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                <p><span className="text-status-success">✓</span> SYSTEM_READY: true</p>
                <p><span className="text-accent-cyan">ℹ</span> CONNECTED_NODES: 3</p>
                <p><span className="text-accent-violet">ℹ</span> LLM_GATEWAY: active</p>
                <p className="text-gray-500">_waiting for prompt injection...</p>
              </div>
            </GlassCard>
          </div>

        </div>
      </div>
    </Layout>
  );
}

