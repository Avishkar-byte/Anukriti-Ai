import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from './GlassCard';

export interface PrimaryButtonProps extends HTMLMotionProps<"button"> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'solid';
    icon?: React.ReactNode;
}

export default function PrimaryButton({ children, className, variant = 'primary', icon, ...props }: PrimaryButtonProps) {
    const baseStyle = "relative px-5 py-2.5 rounded-xl font-medium shadow-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-deep-graphite flex items-center justify-center space-x-2 overflow-hidden overflow-visible";

    let variantStyle = "";
    if (variant === 'primary') {
        variantStyle = "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30 hover:bg-accent-cyan/20 hover:border-accent-cyan/50 focus:ring-accent-cyan/40";
    } else if (variant === 'secondary') {
        variantStyle = "bg-accent-violet/10 text-accent-violet border-accent-violet/30 hover:bg-accent-violet/20 hover:border-accent-violet/50 focus:ring-accent-violet/40";
    } else if (variant === 'danger') {
        variantStyle = "bg-status-error/10 text-status-error border-status-error/30 hover:bg-status-error/20 hover:border-status-error/50 focus:ring-status-error/40";
    } else if (variant === 'ghost') {
        variantStyle = "bg-transparent text-neutral-text border-transparent hover:bg-white/5 hover:text-white";
    } else if (variant === 'solid') {
        variantStyle = "bg-accent-cyan text-deep-graphite font-bold border-accent-cyan hover:bg-accent-cyan/90 shadow-[0_0_15px_rgba(97,218,251,0.4)] hover:shadow-[0_0_25px_rgba(97,218,251,0.6)] focus:ring-accent-cyan/50";
    }

    return (
        <motion.button
            className={cn(baseStyle, variantStyle, className)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            {...props}
        >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <span>{children}</span>
        </motion.button>
    );
}
