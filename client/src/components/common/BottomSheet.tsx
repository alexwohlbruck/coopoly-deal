import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  height?: string; // e.g., "h-64", "h-80"
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  height = "h-80",
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={onClose}
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`fixed bottom-0 left-0 right-0 z-[110] w-full ${height} bg-gray-900 rounded-t-3xl shadow-2xl border-t-2 border-white/20 flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
              {title && (
                <h3 className="text-white font-bold text-base">{title}</h3>
              )}
              <button
                onClick={onClose}
                className="ml-auto text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-4 py-3 border-t border-white/10 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
