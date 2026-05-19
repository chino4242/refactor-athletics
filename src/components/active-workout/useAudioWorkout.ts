'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface AudioWorkoutOptions {
  enabled: boolean;
}

/**
 * Hook that keeps JS alive when screen is off (via silent audio loop)
 * and provides speech announcements for interval-based workouts.
 * 
 * Uses Media Session API for lock screen controls (play/pause).
 */
export function useAudioWorkout({ enabled }: AudioWorkoutOptions) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Start silent audio loop to prevent OS from suspending JS
  const startSilentAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const ctx = new AudioContext();
      // Create a 1-second silent buffer, looped
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      // Connect through a gain node at zero volume
      const gain = ctx.createGain();
      gain.gain.value = 0.001; // Near-silent but enough to keep audio session alive
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      audioCtxRef.current = ctx;
      silentSourceRef.current = source;
      setIsActive(true);
    } catch {}
  }, []);

  const stopSilentAudio = useCallback(() => {
    try {
      silentSourceRef.current?.stop();
      audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    silentSourceRef.current = null;
    setIsActive(false);
  }, []);

  // Media Session API — lock screen controls
  useEffect(() => {
    if (!enabled || !isActive) return;
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Workout Active',
      artist: 'Refactor Athletics',
      album: 'Treadmill',
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      // User tapped pause on lock screen — we keep running but could pause timer
    });
    navigator.mediaSession.setActionHandler('play', () => {
      // Resume
    });

    return () => {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('play', null);
    };
  }, [enabled, isActive]);

  // Speak an announcement via speechSynthesis
  const speak = useCallback((text: string, rate: number = 1.0) => {
    if (!enabled) return;
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.volume = 1;
    speechSynthesis.speak(u);
  }, [enabled]);

  // Announce interval start
  const announceInterval = useCallback((zone: string, seconds: number, incline?: number | null) => {
    if (!enabled) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const duration = mins > 0
      ? (secs > 0 ? `${mins} minute${mins > 1 ? 's' : ''} ${secs} seconds` : `${mins} minute${mins > 1 ? 's' : ''}`)
      : `${secs} seconds`;
    const inclineText = incline && incline > 0 ? ` at ${incline} percent incline` : '';
    speak(`${zone}. ${duration}${inclineText}.`);
  }, [enabled, speak]);

  // Announce halfway
  const announceHalfway = useCallback(() => {
    if (!enabled) return;
    speak('Halfway there.');
  }, [enabled, speak]);

  // Announce countdown (final 5 seconds)
  const announceCountdown = useCallback((secondsLeft: number) => {
    if (!enabled) return;
    if (secondsLeft <= 5 && secondsLeft > 0) {
      speak(String(secondsLeft), 1.2);
    }
  }, [enabled, speak]);

  // Announce workout complete
  const announceComplete = useCallback(() => {
    if (!enabled) return;
    speak('Workout complete. Great job.');
  }, [enabled, speak]);

  // Start/stop based on enabled
  useEffect(() => {
    if (enabled) {
      startSilentAudio();
    } else {
      stopSilentAudio();
    }
    return () => { stopSilentAudio(); };
  }, [enabled, startSilentAudio, stopSilentAudio]);

  return {
    isActive,
    speak,
    announceInterval,
    announceHalfway,
    announceCountdown,
    announceComplete,
  };
}
