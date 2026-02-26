// Basic AudioContext singleton to reuse the context
// We lazy load it to avoid issues with autoplay policies until user interaction occurs (which is guaranteed by the time they start a workout)

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioCtx) {
        // @ts-ignore - Handle webkit prefix if needed, though modern browsers use AudioContext
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
            audioCtx = new Ctx();
        }
    }
    return audioCtx;
};

/**
 * Plays a simple beep sound.
 * @param freq Frequency in Hz (default 800)
 * @param duration Duration in seconds (default 0.1)
 * @param type Oscillator type (default 'sine')
 */
export const playCountdownBeep = (freq: number = 800, duration: number = 0.1, type: OscillatorType = 'sine') => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // Create oscillator
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Connect graph
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Envelope to avoid clicking
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01); // Attack to 30% volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // Decay

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration + 0.1);

    } catch (e) {
        console.warn("Failed to play audio:", e);
    }
};
