"use client";

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpOverlayProps {
    level: number;
    onClose: () => void;
}

export default function LevelUpOverlay({ level, onClose }: LevelUpOverlayProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Trigger confetti
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#22c55e', '#ffffff'] // Green/White theme for Grind
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#22c55e', '#ffffff']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };

        frame();

        // Big burst
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#ffffff', '#fbbf24'] // Green, White, Gold
        });

    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 500);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.8, y: 50, opacity: 0 }}
                        transition={{ type: "spring", damping: 15 }}
                        className="w-full max-w-sm bg-zinc-900 border-2 border-emerald-500 rounded-3xl overflow-hidden shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent"></div>

                        {/* Content */}
                        <div className="relative flex flex-col items-center text-center p-8">

                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="w-24 h-24 mb-6 rounded-full border-4 border-emerald-500 shadow-xl shadow-emerald-500/50 bg-zinc-800 flex items-center justify-center"
                            >
                                <span className="text-4xl">🆙</span>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">
                                    Level Up!
                                </h2>
                                <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs mb-6">
                                    Hard Work Pays Off
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6, type: "spring" }}
                                className="mb-8"
                            >
                                <div className="text-6xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                                    {level}
                                </div>
                                <div className="text-emerald-600/50 font-bold uppercase tracking-[0.5em] text-[10px] mt-2">
                                    Current Level
                                </div>
                            </motion.div>

                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                onClick={handleClose}
                                className="w-full py-3 bg-white text-zinc-900 font-black uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition transform hover:scale-105"
                            >
                                Let's Go
                            </motion.button>

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
