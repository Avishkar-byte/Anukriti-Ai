"use client";
import { useState } from 'react';
import { useProject } from '../context/ProjectContext';

interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
    const { createProject } = useProject();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);

    if (!isOpen) return null;

    const handleCreate = async () => {
        if (!name.trim() || !description.trim()) return;
        setCreating(true);
        const project = await createProject(name, description);
        setCreating(false);
        if (project) {
            setName('');
            setDescription('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#1c212c] border border-white/10 rounded-2xl shadow-2xl p-8 mx-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Create New Project</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Project Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Smart Infusion Pump V2"
                            className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Device Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the medical device in natural language. The AI will extract requirements from this."
                            rows={4}
                            className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-600 resize-none"
                        />
                    </div>

                    <div className="text-xs text-gray-500 bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                        💡 <strong>Tip:</strong> Be specific about power, sensing, safety, and connectivity requirements. The AI generates better results with detailed descriptions.
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={creating || !name.trim() || !description.trim()}
                            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${creating || !name.trim() || !description.trim()
                                    ? 'bg-blue-600/30 text-blue-300/50 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                }`}
                        >
                            {creating ? (
                                <span className="flex items-center space-x-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Creating...</span>
                                </span>
                            ) : 'Create Project'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
