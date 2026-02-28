import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            layout
            className="pointer-events-auto min-w-[300px] max-w-md bg-zinc-900 border border-white/10 shadow-xl rounded-xl overflow-hidden"
          >
            <div className="flex items-start p-4 gap-3">
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm font-medium text-zinc-200">{toast.message}</p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 p-1 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ToastTimer onDismiss={() => onDismiss(toast.id)} type={toast.type} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastTimer = ({ onDismiss, type }: { onDismiss: () => void; type: ToastType }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="h-1 w-full bg-white/5">
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 5, ease: "linear" }}
        className={`h-full ${
          type === 'success' ? 'bg-emerald-500' :
          type === 'error' ? 'bg-red-500' :
          'bg-blue-500'
        }`}
      />
    </div>
  );
};
