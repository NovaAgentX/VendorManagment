import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Database, Layers, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

interface OpeningSplashAnimationProps {
  onComplete: () => void;
  durationMs?: number;
}

export const OpeningSplashAnimation: React.FC<OpeningSplashAnimationProps> = ({
  onComplete,
  durationMs = 2200
}) => {
  const [progress, setProgress] = useState(0);
  const [phaseText, setPhaseText] = useState('Initializing Secure Workspace...');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.round((elapsed / (durationMs - 400)) * 100));
      setProgress(currentProgress);

      if (currentProgress < 30) {
        setPhaseText('Establishing Protected Environment...');
      } else if (currentProgress < 65) {
        setPhaseText('Verifying Vendor & Campaign Engine...');
      } else if (currentProgress < 90) {
        setPhaseText('Loading Database Infrastructure...');
      } else {
        setPhaseText('System Ready');
      }

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setIsFinished(true);
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [durationMs, onComplete]);

  const handleSkip = () => {
    setIsFinished(true);
    setTimeout(() => {
      onComplete();
    }, 200);
  };

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden select-none"
        >
          {/* Ambient Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Main Logo & Animated Ring Container */}
          <div className="relative flex flex-col items-center max-w-sm w-full z-10 text-center">
            {/* Animated Center Orb & Badge */}
            <div className="relative mb-8 flex items-center justify-center">
              {/* Outer pulsing ring */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3], rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute w-28 h-28 rounded-3xl border border-indigo-500/30"
              />

              {/* Second rotating dashed ring */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.8, 0.4], rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute w-24 h-24 rounded-2xl border border-dashed border-teal-400/40"
              />

              {/* Center Logo Icon */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 p-0.5 shadow-2xl shadow-indigo-500/30 flex items-center justify-center"
              >
                <div className="w-full h-full bg-slate-950/80 backdrop-blur-sm rounded-[14px] flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Shield className="w-9 h-9 text-teal-300 drop-shadow-[0_0_12px_rgba(45,212,191,0.5)]" />
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Title & Branding */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-2 mb-8"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Enterprise Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Vendor & Campaign Tracker
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Unified Campaign Operations & Banking Intelligence
              </p>
            </motion.div>

            {/* Progress Bar & Phase Status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="w-full space-y-3"
            >
              {/* Status Text with Spinner */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
                <span className="flex items-center gap-2 text-slate-300">
                  {progress === 100 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  )}
                  <span>{phaseText}</span>
                </span>
                <span className="font-bold text-teal-400">{progress}%</span>
              </div>

              {/* Progress Line */}
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* Quick Skip button */}
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={handleSkip}
              className="mt-8 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Press anywhere or click to skip</span>
              <ArrowRight className="w-3 h-3" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
