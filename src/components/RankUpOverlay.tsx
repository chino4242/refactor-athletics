import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

interface RankUpOverlayProps {
    rankName: string;
    rankImage: string;
    rankDescription: string;
    onClose: () => void;
}

export default function RankUpOverlay({ rankName, rankImage, rankDescription, onClose }: RankUpOverlayProps) {
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
                colors: ['#ff5722', '#ff9800', '#ffffff'] // Orange/Fire theme colors
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#ff5722', '#ff9800', '#ffffff']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };

        frame();

        // Also do a big burst at the start
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ff5722', '#ff9800', '#ffffff']
        });

    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 500); // Wait for exit animation
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
                        className="w-full max-w-lg bg-zinc-900 border-2 border-orange-500 rounded-3xl overflow-hidden shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent"></div>

                        {/* Content */}
                        <div className="relative flex flex-col items-center text-center p-8">

                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="w-32 h-32 mb-6 rounded-full border-4 border-orange-500 shadow-xl shadow-orange-500/50 bg-zinc-800 overflow-hidden"
                            >
                                <img src={rankImage} alt={rankName} className="w-full h-full object-cover" />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">
                                    Rank Up!
                                </h2>
                                <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full mb-6"></div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <h3 className="text-2xl font-bold text-orange-400 mb-2">{rankName}</h3>
                                <p className="text-zinc-400 font-medium leading-relaxed mb-8">
                                    "{rankDescription}"
                                </p>
                            </motion.div>

                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                onClick={handleClose}
                                className="px-8 py-3 bg-white text-zinc-900 font-black uppercase tracking-wider rounded-full hover:bg-zinc-200 transition transform hover:scale-105"
                            >
                                Continue
                            </motion.button>

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
