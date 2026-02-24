"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { useProject } from '../context/ProjectContext';
import GlassCard from '../components/ui/GlassCard';
import PrimaryButton from '../components/ui/PrimaryButton';
import { Zap, Brain, Activity, Terminal, Database, ShieldAlert, Thermometer, AlertCircle, TrendingUp, Sliders } from 'lucide-react';

function ChannelChart({ name, values, unit, color }: { name: string; values: number[]; unit: string; color: string }) {
    if (!values || values.length === 0) return null;

    const maxV = Math.max(...values);
    const minV = Math.min(...values);
    const range = maxV - minV || 1;

    // Downsample for SVG performance
    const step = Math.max(1, Math.floor(values.length / 200));
    const sampled = values.filter((_, i) => i % step === 0);

    const points = sampled.map((v, i) => {
        const x = (i / (sampled.length - 1)) * 100;
        const y = 100 - ((v - minV) / range) * 80 - 10;
        return `${x},${y}`;
    }).join(' ');

    return (
        <GlassCard hoverLift className="p-5 flex flex-col justify-between group overflow-hidden relative">
            {/* Subtle background glow */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)` }}
            />

            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4" style={{ color }} />
                    <span className="text-sm font-bold text-white tracking-wide uppercase">{name}</span>
                </div>
                <div className="flex space-x-3 text-[10px] text-muted-text font-mono uppercase tracking-widest bg-deep-graphite/50 px-2 py-1 rounded-md border border-glass-border">
                    <span>Min: <span className="text-white">{minV.toFixed(2)} {unit}</span></span>
                    <span className="opacity-50">|</span>
                    <span>Max: <span className="text-white">{maxV.toFixed(2)} {unit}</span></span>
                </div>
            </div>
            <div className="h-28 relative z-10">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id={`grad-${name}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                        </linearGradient>
                        <filter id={`glow-${name}`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    <polygon points={`0,100 ${points} 100,100`} fill={`url(#grad-${name})`} className="transition-all duration-300 group-hover:opacity-80 opacity-50" />
                    <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" filter={`url(#glow-${name})`} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                </svg>
            </div>
        </GlassCard>
    );
}

const CHANNEL_COLORS: Record<string, string> = {
    voltage: '#61dafb', // cyan
    soc: '#ffb86c', // orange/yellow
    power: '#ff79c6', // pink
    temperature: '#ff5555', // red
    current: '#bd93f9', // purple
    leakage: '#ffb86c', // orange
    flow: '#8be9fd', // cyan
    pressure: '#ff79c6', // pink
    speed: '#50fa7b', // green
    signal: '#bd93f9', // purple
    reservoir: '#50fa7b', // green
    reading: '#f1fa8c', // yellow
    quantized: '#bd93f9', // purple
};

function getChannelColor(channelName: string): string {
    for (const [key, color] of Object.entries(CHANNEL_COLORS)) {
        if (channelName.toLowerCase().includes(key)) return color;
    }
    return '#6272a4'; // default gray-purple
}

const renderLogLine = (line: string, i: number) => {
    // Step Headers
    if (line.startsWith("Step ")) {
        return (
            <div key={i} className="mt-4 mb-2 p-2 bg-accent-violet/10 border-l-2 border-accent-violet text-white font-bold text-[11px] rounded-r-md flex items-center">
                <Terminal className="w-3 h-3 mr-2 text-accent-violet" />
                {line}
            </div>
        );
    }
    // Metric rows
    if (line.includes("→")) {
        const [channel, metricsStr] = line.split("→");
        const metrics = metricsStr.split(",").map(m => m.trim());
        return (
            <div key={i} className="my-1.5 p-2 bg-[#0a0d14]/80 border border-white/5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2 hover:border-white/10 transition-colors">
                <div className="text-accent-cyan font-bold truncate flex items-center md:w-1/2 flex-shrink-0 text-[10px]">
                    <Activity className="w-3 h-3 mr-1.5 opacity-50 flex-shrink-0" />
                    <span className="truncate" title={channel.trim()}>{channel.trim()}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                    {metrics.map((m, idx) => {
                        const parts = m.split("=");
                        if (parts.length === 2) {
                            const [k, v] = parts;
                            return (
                                <span key={idx} className="bg-white/5 px-2 py-0.5 rounded text-[9px] flex items-center border border-white/5">
                                    <span className="text-muted-text mr-1">{k.trim()}</span>
                                    <span className="text-white font-mono">{v.trim()}</span>
                                </span>
                            );
                        }
                        return (
                            <span key={idx} className="bg-white/5 px-2 py-0.5 rounded text-[9px] text-white font-mono border border-white/5">{m.trim()}</span>
                        )
                    })}
                </div>
            </div>
        );
    }
    // Highlighted Success Lines
    if (line.startsWith("Overall") || line.startsWith("Pipeline complete") || line.startsWith("Model saved:")) {
        return (
            <div key={i} className="my-3 p-2 bg-status-success/10 border border-status-success/20 text-status-success rounded-lg font-bold flex items-center shadow-[0_0_10px_rgba(80,250,123,0.1)] text-[10px]">
                <Activity className="w-3 h-3 mr-2" />
                {line}
            </div>
        );
    }
    // Highlighted Error Lines
    if (line.startsWith("ERROR:") || line.includes("Critical failure") || line.includes("❌")) {
        return (
            <div key={i} className="my-3 p-2 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg font-bold flex items-center shadow-[0_0_10px_rgba(255,85,85,0.1)] text-[10px]">
                <ShieldAlert className="w-3 h-3 mr-2" />
                {line}
            </div>
        );
    }
    // Hide individual "Training channel" prefix lines since metric rows cover them
    if (line.startsWith("Training channel:") || line.startsWith("Trainer status:") || line.startsWith("Starting REAL Digital Twin")) {
        return null;
    }
    // Detailed logs
    if (line.startsWith("Data split:") || line.startsWith("Features:") || line.startsWith("Training matrix:") || line.startsWith("Simulation completed:") || line.startsWith("Inference test passed:")) {
        return (
            <div key={i} className="flex items-center space-x-2 my-1.5 text-muted-text bg-white/5 p-1.5 px-3 rounded text-[10px] border border-white/5">
                <Database className="w-3 h-3 opacity-50 flex-shrink-0" />
                <span className="leading-relaxed">{line}</span>
            </div>
        )
    }

    return (
        <div key={i} className="flex items-start mb-1 text-gray-400 text-[10px]">
            <span className="text-white/20 mr-2 select-none font-bold">❯</span>
            <span className="leading-relaxed">{line.trim()}</span>
        </div>
    );
};

export default function Simulation() {
    const { activeProject, runSimulation, trainTwin, loading } = useProject();
    const [simResult, setSimResult] = useState<any>(null);
    const [simRunning, setSimRunning] = useState(false);

    // What-If State
    const { runWhatIfSimulation } = useProject();
    const [overrideTemp, setOverrideTemp] = useState(25);
    const [overrideBattery, setOverrideBattery] = useState(100);
    const [whatIfRunning, setWhatIfRunning] = useState(false);

    const handleRunWhatIf = async () => {
        if (!activeProject) return;
        setWhatIfRunning(true);
        const data = await runWhatIfSimulation({
            "ambient_temp": overrideTemp,
            "battery_degradation_pct": 100 - overrideBattery
        });
        setWhatIfRunning(false);
        if (data) setSimResult(data);
    };

    // ML Training States
    const [training, setTraining] = useState(false);
    const [modelData, setModelData] = useState<any>(activeProject?.twin || null);
    const [trainProgress, setTrainProgress] = useState(0);
    const [trainLog, setTrainLog] = useState<string[]>([]);

    useEffect(() => {
        if (activeProject?.simulation?.channels && !simResult) {
            setSimResult(activeProject.simulation);
        }
        if (activeProject?.twin && !modelData) {
            setModelData(activeProject.twin);
        }
    }, [activeProject]);

    const handleRunSimulation = async () => {
        if (!activeProject) { alert("Select a project first."); return; }
        if (!activeProject.requirements) { alert("Generate requirements first."); return; }

        setSimRunning(true);
        const data = await runSimulation();
        setSimRunning(false);
        if (data) setSimResult(data);
    };

    const handleTrainTwin = async () => {
        if (!activeProject) { alert("Select a project first."); return; }
        if (!activeProject.requirements) { alert("Generate requirements first."); return; }

        setTraining(true);
        setTrainProgress(0);
        setTrainLog(["Initializing localized training environment...", "Allocating tensor buffers..."]);

        // Smooth progress animation 
        const progressInterval = setInterval(() => {
            setTrainProgress(p => {
                if (p >= 90) { clearInterval(progressInterval); return 90; }
                return p + (Math.random() * 5 + 2);
            });
        }, 400);

        const data = await trainTwin();

        clearInterval(progressInterval);
        setTrainProgress(100);
        setTraining(false);

        if (data) {
            setModelData(data);
            if (data.pipeline_log && data.pipeline_log.length > 0) {
                setTrainLog(data.pipeline_log);
            } else {
                setTrainLog(prev => [...prev, "Surrogate model compiled successfully.", "Ready for deployment."]);
            }
        } else {
            setTrainLog(prev => [...prev, "❌ Critical failure during compilation. Check telemetry logs."]);
        }
    };

    const channels = simResult?.channels || {};
    const channelNames = Object.keys(channels);
    const metrics = simResult?.metrics || {};
    const warnings = simResult?.warnings || [];

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 relative">

                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                            Simulation & Physics
                        </h1>
                        <p className="text-muted-text mt-2 text-sm">
                            {activeProject ? `Project: ${activeProject.name}` : 'No project selected'}
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <PrimaryButton
                            variant="secondary"
                            onClick={handleRunSimulation}
                            disabled={simRunning || whatIfRunning || training || loading || !activeProject?.requirements}
                            icon={simRunning ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" /> : <Zap size={16} className="text-accent-cyan" />}
                            className={simRunning || whatIfRunning || training || loading || !activeProject?.requirements ? 'opacity-50 cursor-not-allowed text-white hover:text-white' : 'text-accent-cyan border-accent-cyan/30 hover:border-accent-cyan/60'}
                        >
                            {simRunning ? 'Computing...' : (simResult ? 'Restart Simulation' : 'Run Simulation')}
                        </PrimaryButton>

                        <PrimaryButton
                            onClick={handleTrainTwin}
                            disabled={training || simRunning || loading || !simResult}
                            icon={training ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" /> : <Brain size={16} />}
                            className={training || simRunning || loading || !simResult ? 'opacity-50 cursor-not-allowed' : 'bg-accent-violet hover:bg-accent-violet/80 text-white shadow-[0_0_15px_rgba(155,124,255,0.3)]'}
                        >
                            {training ? `Training DL ${Math.floor(trainProgress)}%` : (modelData ? 'Retrain ML Twin' : 'Train Surrogate Twin')}
                        </PrimaryButton>
                    </div>
                </header>

                {!activeProject?.requirements && (
                    <GlassCard className="p-4 border-status-warning/40 bg-status-warning/5">
                        <p className="text-sm text-status-warning flex items-center">
                            <AlertCircle size={16} className="mr-2" /> Complete Requirements step first — simulation requires physics constraints.
                        </p>
                    </GlassCard>
                )}

                {/* Status Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <GlassCard hoverLift className="p-5 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Database size={64} />
                        </div>
                        <p className="text-[10px] text-muted-text mb-1 uppercase tracking-widest font-bold">Physics Engine</p>
                        <p className="text-xl font-bold tracking-tight text-white">Numpy + LLM</p>
                    </GlassCard>
                    <GlassCard hoverLift className="p-5">
                        <p className="text-[10px] text-muted-text mb-1 uppercase tracking-widest font-bold">System Status</p>
                        <div className="flex items-center space-x-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${simRunning ? 'bg-status-warning animate-pulse shadow-[0_0_10px_rgba(255,184,108,0.8)]' : simResult ? 'bg-status-success shadow-[0_0_10px_rgba(80,250,123,0.8)]' : 'bg-muted-text/50'}`}></span>
                            <p className="text-xl font-bold tracking-tight text-white">
                                {simRunning ? 'Computing' : simResult ? 'Stable' : 'Standby'}
                            </p>
                        </div>
                    </GlassCard>
                    <GlassCard hoverLift className="p-5">
                        <p className="text-[10px] text-muted-text mb-1 uppercase tracking-widest font-bold">Subsystem Models</p>
                        <p className="text-xl font-bold tracking-tight text-white">{simResult?.models_run || '—'}</p>
                    </GlassCard>
                    <GlassCard hoverLift className="p-5">
                        <p className="text-[10px] text-muted-text mb-1 uppercase tracking-widest font-bold">Compute Latency</p>
                        <p className="text-xl font-bold tracking-tight text-white font-mono">{simResult?.duration_seconds ? `${(simResult.duration_seconds * 1000).toFixed(0)} ms` : '—'}</p>
                    </GlassCard>
                </div>

                {/* Warnings Display */}
                <AnimatePresence>
                    {warnings.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3"
                        >
                            {warnings.map((w: string, i: number) => {
                                const isCritical = w.includes('SAFETY') || w.includes('VIOLATION');
                                const isWarning = w.includes('THERMAL') || w.includes('ELEVATED');
                                const Icon = isCritical ? ShieldAlert : (isWarning ? Thermometer : AlertCircle);
                                const colorClass = isCritical ? 'text-status-error border-status-error/30 bg-status-error/10'
                                    : (isWarning ? 'text-status-warning border-status-warning/30 bg-status-warning/10'
                                        : 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10');

                                return (
                                    <GlassCard key={i} className={`p-4 flex items-start space-x-3 ${colorClass} shadow-none`}>
                                        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm font-medium">{w}</div>
                                    </GlassCard>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* What-If Scenario Testing */}
                {simResult && (
                    <GlassCard className="p-6 border-accent-violet/30 bg-accent-violet/5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex-1 space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center">
                                    <Sliders className="mr-2 text-accent-violet w-5 h-5" /> What-If Stress Testing
                                </h3>
                                <p className="text-sm text-muted-text">Inject extreme environmental variables into the physics engine to simulate device failure modes or hardware degradation.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white">External Temp</span>
                                            <span className="text-accent-cyan font-mono">{overrideTemp}°C</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="80" value={overrideTemp}
                                            onChange={(e) => setOverrideTemp(Number(e.target.value))}
                                            className="w-full h-1.5 bg-deep-graphite rounded-lg appearance-none cursor-pointer accent-accent-cyan"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white">Battery Health (End of Life)</span>
                                            <span className="text-status-warning font-mono">{overrideBattery}%</span>
                                        </div>
                                        <input
                                            type="range" min="10" max="100" value={overrideBattery}
                                            onChange={(e) => setOverrideBattery(Number(e.target.value))}
                                            className="w-full h-1.5 bg-deep-graphite rounded-lg appearance-none cursor-pointer accent-status-warning"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-shrink-0 md:pl-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 flex flex-col justify-center">
                                <PrimaryButton
                                    onClick={handleRunWhatIf}
                                    disabled={whatIfRunning || simRunning}
                                    icon={whatIfRunning ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" /> : <Zap size={16} />}
                                    className={`!bg-accent-violet hover:!bg-accent-violet/80 border-none ${whatIfRunning || simRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {whatIfRunning ? 'Simulating Faults...' : 'Run Scenario Injection'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </GlassCard>
                )}

                {/* Oscilloscope Channels */}
                {channelNames.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-4"
                    >
                        <div className="flex justify-between items-center border-b border-glass-border pb-2">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <Activity className="mr-2 text-accent-cyan w-5 h-5" /> Telemetry Channels
                            </h3>
                            <span className="text-[10px] font-mono text-muted-text uppercase tracking-widest bg-deep-graphite px-2 py-1 rounded border border-white/5 shadow-inner">
                                {simResult?.time_steps || 500} TIMESTEPS
                            </span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {channelNames.map((chName: string, i: number) => {
                                const ch = channels[chName];
                                return (
                                    <motion.div key={chName} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                                        <ChannelChart
                                            name={chName.replace(/_/g, ' ')}
                                            values={ch.values}
                                            unit={ch.unit}
                                            color={getChannelColor(chName)}
                                        />
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Analytics Metrics */}
                {Object.keys(metrics).length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <GlassCard className="p-6">
                            <h3 className="text-xs font-bold text-muted-text uppercase tracking-widest mb-4 flex items-center">
                                <TrendingUp className="mr-2 w-4 h-4" /> Derived Analytics
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {Object.entries(metrics).map(([key, value]) => (
                                    <div key={key} className="bg-deep-graphite/40 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors">
                                        <p className="text-[10px] text-muted-text uppercase tracking-wider mb-1 truncate" title={key.replace(/_/g, ' ')}>
                                            {key.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-lg font-mono font-bold text-accent-cyan">
                                            {typeof value === 'number'
                                                ? (value % 1 === 0 ? value : (value as number).toFixed(4))
                                                : String(value)
                                            }
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* ML Training Section */}
                <AnimatePresence>
                    {(training || trainLog.length > 0 || modelData) && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="pt-8 mt-8 border-t border-glass-border relative"
                        >
                            {/* Decorative background element */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-1/2 h-20 bg-accent-violet/10 blur-[50px] pointer-events-none rounded-full" />

                            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                                <Brain className="mr-3 text-accent-violet w-6 h-6" /> Surrogate ML Twin
                            </h3>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Training Console */}
                                <GlassCard className="h-[420px] flex flex-col relative overflow-hidden group">
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-accent-violet/50 to-transparent" />
                                    <div className="p-5 border-b border-glass-border bg-deep-graphite/30 flex justify-between items-center z-10">
                                        <h4 className="text-[10px] font-bold text-muted-text uppercase tracking-widest flex items-center">
                                            <Terminal className="w-3 h-3 mr-2" /> Compiler Output
                                        </h4>
                                        <div className="flex space-x-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-status-error border border-white/10" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-status-warning border border-white/10" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-status-success border border-white/10" />
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 overflow-y-auto space-y-2 font-mono text-[11px] scrollbar-thin scrollbar-thumb-glass-border z-10 bg-[#0f111a]/80">
                                        {trainLog.length === 0 && !training ? (
                                            <p className="text-muted-text/50 italic flex items-center justify-center h-full">System idle. Initiate training sequence.</p>
                                        ) : (
                                            trainLog.map((line, i) => renderLogLine(line, i))
                                        )}
                                        {training && (
                                            <div className="flex items-center text-accent-cyan mt-4 animate-pulse">
                                                <span className="mr-3 text-[10px] font-bold">❯</span>
                                                <span className="w-1.5 h-3 bg-accent-cyan inline-block rounded-sm"></span>
                                            </div>
                                        )}
                                    </div>
                                    {training && (
                                        <div className="h-1 bg-deep-graphite w-full absolute bottom-0 z-20">
                                            <motion.div
                                                className="h-full bg-accent-violet shadow-[0_0_10px_rgba(155,124,255,0.8)]"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${trainProgress}%` }}
                                            />
                                        </div>
                                    )}
                                </GlassCard>

                                {/* Active Model Specs */}
                                <GlassCard className="h-[420px] flex flex-col relative overflow-hidden">
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-accent-cyan/50 to-transparent" />
                                    <div className="p-5 border-b border-glass-border bg-deep-graphite/30">
                                        <h4 className="text-[10px] font-bold text-muted-text uppercase tracking-widest flex items-center">
                                            <Database className="w-3 h-3 mr-2" /> Model Details
                                        </h4>
                                    </div>
                                    <div className="p-5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-glass-border">
                                        {modelData ? (
                                            <div className="space-y-6">
                                                <div className="p-4 bg-accent-cyan/10 border border-accent-cyan/20 rounded-xl relative overflow-hidden group">
                                                    <div className="absolute right-0 top-0 w-32 h-32 bg-accent-cyan/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg-accent-cyan/20 transition-colors" />
                                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                                        <div>
                                                            <div className="text-[10px] uppercase text-accent-cyan font-bold tracking-wider mb-1">Active Artifact</div>
                                                            <div className="text-sm text-white font-mono break-all">{modelData.model_id}</div>
                                                        </div>
                                                        <div className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_8px_rgba(97,218,251,0.8)] animate-pulse mt-1" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {[
                                                        { label: 'Network R² Score', value: `${((modelData.accuracy || 0) * 100).toFixed(1)}%`, highlight: true },
                                                        { label: 'Architecture', value: 'GB + MLP Pipeline' },
                                                        { label: 'Memory Footprint', value: modelData.model_size_kb ? `${modelData.model_size_kb} KB` : '—' },
                                                        { label: 'Training Epochs', value: modelData.train_samples || '—' },
                                                        { label: 'Input Tensors', value: modelData.n_features || '—' },
                                                        { label: 'Output Predictors', value: modelData.n_targets || '—' },
                                                        { label: 'Compile Time', value: modelData.train_duration_seconds ? `${modelData.train_duration_seconds}s` : '—' },
                                                        { label: 'Framework', value: 'scikit-learn=1.3.2' },
                                                    ].map(({ label, value, highlight }) => (
                                                        <div key={label} className="bg-deep-graphite/30 rounded-lg p-2.5 border border-white/5">
                                                            <div className="text-[9px] uppercase tracking-wider text-muted-text mb-1">{label}</div>
                                                            <div className={`text-sm font-medium ${highlight ? 'text-accent-success font-bold' : 'text-white'}`}>{value}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Channel R2 Scores */}
                                                {modelData.channel_metrics && Object.keys(modelData.channel_metrics).length > 0 && (
                                                    <div className="pt-2 border-t border-glass-border">
                                                        <p className="text-[10px] font-bold text-muted-text mb-3 uppercase tracking-widest">Channel Confidence</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {Object.entries(modelData.channel_metrics).map(([ch, m]: [string, any]) => {
                                                                const score = m.r2_score;
                                                                const isExcellent = score > 0.9;
                                                                const isGood = score > 0.7;
                                                                return (
                                                                    <div key={ch} className="flex justify-between items-center bg-deep-graphite/50 px-3 py-1.5 rounded-md border border-white/5">
                                                                        <span className="text-[10px] text-gray-300 uppercase truncate mr-2" title={ch}>{ch.replace(/_/g, ' ')}</span>
                                                                        <span className={`text-xs font-mono font-bold ${isExcellent ? 'text-status-success' : isGood ? 'text-status-warning' : 'text-status-error'}`}>
                                                                            {score?.toFixed(3)}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                                <Database className="w-12 h-12 text-muted-text mb-4 opacity-50" />
                                                <p className="text-sm text-white font-medium mb-1 tracking-wide">No Active Model Instance</p>
                                                <p className="text-[11px] text-muted-text max-w-[200px] leading-relaxed">Train surrogate twin to compile serialized model metadata.</p>
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty State Overlay */}
                {!simResult && !simRunning && !training && !modelData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 pointer-events-none"
                    >
                        <div className="text-center opacity-30 flex flex-col items-center">
                            <Zap className="w-24 h-24 mb-6 text-muted-text" strokeWidth={1} />
                            <h2 className="text-2xl font-light text-white mb-2">Simulation Engine Idle</h2>
                            <p className="text-sm text-muted-text max-w-sm">Awaiting prompt to inject physics constraints and instantiate simulation modules.</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </Layout>
    );
}
