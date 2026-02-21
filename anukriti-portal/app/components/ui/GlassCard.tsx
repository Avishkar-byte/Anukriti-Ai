import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, HTMLMotionProps } from 'framer-motion';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    hoverLift?: boolean;
}

export default function GlassCard({ children, className, hoverLift = false, ...props }: GlassCardProps) {
    return (
        <motion.div
            className={cn(
                "backdrop-blur-md bg-glass border border-glass-border rounded-2xl shadow-lg relative overflow-hidden",
                className
            )}
            whileHover={hoverLift ? { y: -6, scale: 1.01, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)" } : undefined}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            {...props}
        >
            {/* Subtle inner top highlight to simulate glass thickness */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            {children}
        </motion.div>
    );
}
