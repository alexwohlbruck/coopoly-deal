import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { Card, PropertyColor } from "../../types/game";
import { PROPERTY_COLOR_HEX, PROPERTY_COLOR_LABEL } from "../../types/game";

interface WildcardFlipDialogProps {
  card: Card;
  currentColor: PropertyColor;
  onFlip: (newColor: PropertyColor) => void;
  onClose: () => void;
}

export function WildcardFlipDialog({
  card,
  currentColor,
  onFlip,
  onClose,
}: WildcardFlipDialogProps) {
  const availableColors = card.colors || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Change Wildcard Color</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-300 text-sm mb-4">
          Select a new color for this wildcard property:
        </p>

        <div className="grid grid-cols-2 gap-3">
          {availableColors.map((color) => (
            <button
              key={color}
              onClick={() => {
                onFlip(color);
                onClose();
              }}
              disabled={color === currentColor}
              className={`
                px-4 py-3 rounded-xl font-semibold text-white transition-all
                ${color === currentColor ? "opacity-50 cursor-not-allowed ring-2 ring-yellow-400" : "hover:scale-105 hover:shadow-lg"}
              `}
              style={{ backgroundColor: PROPERTY_COLOR_HEX[color] }}
            >
              {PROPERTY_COLOR_LABEL[color]}
              {color === currentColor && (
                <span className="block text-xs mt-1">(Current)</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}
