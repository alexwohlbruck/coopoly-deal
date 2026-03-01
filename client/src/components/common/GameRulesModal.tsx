import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface GameRulesModalProps {
  isOpen: boolean;
  maxHandSize?: number;
  allowDuplicateSets?: boolean;
  useSocialistTheme?: boolean;
  onClose: () => void;
}

export function GameRulesModal({
  isOpen,
  maxHandSize = 7,
  allowDuplicateSets = true,
  useSocialistTheme = false,
  onClose,
}: GameRulesModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl max-h-[85vh] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-3xl font-black text-white">Game Rules</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Overview */}
            <section>
              <h3 className="text-2xl font-bold text-emerald-400 mb-3">
                Overview
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Co-Opoly Deal is a card game for 2–6 {useSocialistTheme ? "comrades" : "players"}. The goal is to be
                the first {useSocialistTheme ? "comrade" : "player"} to collect{" "}
                <span className="font-bold text-white">
                  3 complete property sets
                  {allowDuplicateSets ? "" : " of different colors"}
                </span>{" "}
                on the table in front of you. {useSocialistTheme ? "Comrades" : "Players"} take turns drawing cards,
                playing cards, and using {useSocialistTheme ? "directive" : "action"} cards to collect {useSocialistTheme ? "levies" : "rent"}, {useSocialistTheme ? "expropriate" : "steal"}
                properties, and block opponents.
              </p>
            </section>

            {/* Setup */}
            <section>
              <h3 className="text-2xl font-bold text-emerald-400 mb-3">
                Setup
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">1.</span>
                  <span>Shuffle the full 106-card deck.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">2.</span>
                  <span>
                    Deal <span className="font-bold text-white">5 cards</span>{" "}
                    face-down to each {useSocialistTheme ? "comrade" : "player"}.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">3.</span>
                  <span>
                    Place the remaining cards face-down in the center as the
                    draw pile.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">4.</span>
                  <span>
                    The first {useSocialistTheme ? "comrade" : "player"} is chosen randomly. Play proceeds
                    clockwise.
                  </span>
                </li>
              </ul>
            </section>

            {/* Turn Structure */}
            <section>
              <h3 className="text-2xl font-bold text-emerald-400 mb-3">
                Turn Structure
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    1. Draw Phase
                  </h4>
                  <ul className="space-y-1 text-gray-300 ml-4">
                    <li>
                      • Draw{" "}
                      <span className="font-bold text-white">2 cards</span> from
                      the draw pile
                    </li>
                    <li>
                      • If you have{" "}
                      <span className="font-bold text-white">0 cards</span> in
                      hand, draw{" "}
                      <span className="font-bold text-white">5 cards</span>{" "}
                      instead
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    2. Play Phase
                  </h4>
                  <ul className="space-y-1 text-gray-300 ml-4">
                    <li>
                      • Play{" "}
                      <span className="font-bold text-white">
                        up to 3 cards
                      </span>{" "}
                      from your hand
                    </li>
                    <li>
                      • Cards can be played to your bank, property area, or as
                      {useSocialistTheme ? "directive" : "action"} cards
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    3. Discard Phase
                  </h4>
                  <ul className="space-y-1 text-gray-300 ml-4">
                    <li>
                      • You may have{" "}
                      <span className="font-bold text-white">
                        no more than{" "}
                        {maxHandSize === 999
                          ? "an unlimited number of"
                          : maxHandSize}{" "}
                        cards
                      </span>{" "}
                      in hand
                    </li>
                    <li>• Discard excess cards to the discard pile</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Winning */}
            <section>
              <h3 className="text-2xl font-bold text-emerald-400 mb-3">
                Winning the Game
              </h3>
              <p className="text-gray-300 leading-relaxed">
                The first {useSocialistTheme ? "comrade" : "player"} to have{" "}
                <span className="font-bold text-white">
                  3 complete property sets
                </span>{" "}
                on the table wins immediately. Property sets must be on the
                table — cards in your hand do not count.
              </p>
            </section>

            {/* Property Sets */}
            <section>
              <h3 className="text-2xl font-bold text-emerald-400 mb-3">
                Property Sets
              </h3>
              <div className="bg-gray-800/50 rounded-lg p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-400 font-semibold">
                        Color
                      </th>
                      <th className="text-center py-2 px-3 text-gray-400 font-semibold">
                        Cards Needed
                      </th>
                      <th className="text-center py-2 px-3 text-gray-400 font-semibold">
                        {useSocialistTheme ? "Levy" : "Rent"} (1)
                      </th>
                      <th className="text-center py-2 px-3 text-gray-400 font-semibold">
                        {useSocialistTheme ? "Levy" : "Rent"} (2)
                      </th>
                      <th className="text-center py-2 px-3 text-gray-400 font-semibold">
                        {useSocialistTheme ? "Levy" : "Rent"} (3)
                      </th>
                      <th className="text-center py-2 px-3 text-gray-400 font-semibold">
                        {useSocialistTheme ? "Levy" : "Rent"} (4)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-gray-700/50">
                      <td className="py-2 px-3">Brown</td>
                      <td className="text-center py-2 px-3">2</td>
                      <td className="text-center py-2 px-3">1M</td>
                      <td className="text-center py-2 px-3">2M</td>
                      <td className="text-center py-2 px-3">—</td>
                      <td className="text-center py-2 px-3">—</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-2 px-3">Light Blue</td>
                      <td className="text-center py-2 px-3">3</td>
                      <td className="text-center py-2 px-3">1M</td>
                      <td className="text-center py-2 px-3">2M</td>
                      <td className="text-center py-2 px-3">3M</td>
                      <td className="text-center py-2 px-3">—</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-2 px-3">Pink</td>
                      <td className="text-center py-2 px-3">3</td>
                      <td className="text-center py-2 px-3">1M</td>
                      <td className="text-center py-2 px-3">2M</td>
                      <td className="text-center py-2 px-3">4M</td>
                      <td className="text-center py-2 px-3">—</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-2 px-3">Orange</td>
                      <td className="text-center py-2 px-3">3</td>
                      <td className="text-center py-2 px-3">1M</td>
                      <td className="text-center py-2 px-3">3M</td>
                      <td className="text-center py-2 px-3">5M</td>
                      <td className="text-center py-2 px-3">—</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-2 px-3">Red</td>
                      <td className="text-center py-2 px-3">3</td>
                      <td className="text-center py-2 px-3">2M</td>
                      <td className="text-center py-2 px-3">3M</td>
                      <td className="text-center py-2 px-3">6M</td>
                      <td className="text-center py-2 px-3">—</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-2 px-3">Yellow</td>
                      <td className="text-center py-2 px-3">3</td>
                      <td className="text-center py-2 px-3">2M</td>
                      <td className="text-center py-2 px-3">4M</td>
                      <td className="text-center py-2 px-3">6M</td>
                      <td className="text-center py-2 px-3">—</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-2 px-3">Green</td>
                      <td className="text-center py-2 px-3">3</td>
                      <td className="text-center py-2 px-3">2M</td>
                      <td className="text-center py-2 px-3">4M</td>
                      <td className="text-center py-2 px-3">7M</td>
                      <td className="text-center py-2 px-3">—</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-2 px-3">Dark Blue</td>
                      <td className="text-center py-2 px-3">2</td>
                      <td className="text-center py-2 px-3">3M</td>
                      <td className="text-center py-2 px-3">8M</td>
                      <td className="text-center py-2 px-3">—</td>
                      <td className="text-center py-2 px-3">—</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-2 px-3">Railroad</td>
                      <td className="text-center py-2 px-3">4</td>
                      <td className="text-center py-2 px-3">1M</td>
                      <td className="text-center py-2 px-3">2M</td>
                      <td className="text-center py-2 px-3">3M</td>
                      <td className="text-center py-2 px-3">4M</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Utility</td>
                      <td className="text-center py-2 px-3">2</td>
                      <td className="text-center py-2 px-3">1M</td>
                      <td className="text-center py-2 px-3">2M</td>
                      <td className="text-center py-2 px-3">—</td>
                      <td className="text-center py-2 px-3">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                * Houses add +3M, Hotels add +4M to complete sets (not available
                for Railroad/Utility)
              </p>
            </section>

            {/* Key Action Cards */}
            <section>
              <h3 className="text-2xl font-bold text-emerald-400 mb-3">
                Key {useSocialistTheme ? "Directive" : "Action"} Cards
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h4 className="font-semibold text-white mb-1">Pass Go</h4>
                  <p className="text-gray-300 text-sm">
                    Draw 2 cards from the deck.
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h4 className="font-semibold text-white mb-1">Sly Deal</h4>
                  <p className="text-gray-300 text-sm">
                    {useSocialistTheme ? "Expropriate" : "Steal"} one property card from any opponent (not from complete
                    sets).
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h4 className="font-semibold text-white mb-1">Force Deal</h4>
                  <p className="text-gray-300 text-sm">
                    Swap one of your properties for one of an opponent's
                    (neither from complete sets).
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h4 className="font-semibold text-white mb-1">
                    Deal Breaker
                  </h4>
                  <p className="text-gray-300 text-sm">
                    {useSocialistTheme ? "Expropriate" : "Steal"} an entire complete property set from an opponent.
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h4 className="font-semibold text-white mb-1">
                    Debt Collector
                  </h4>
                  <p className="text-gray-300 text-sm">Charge one {useSocialistTheme ? "comrade" : "player"} 5M.</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h4 className="font-semibold text-white mb-1">
                    It's My Birthday
                  </h4>
                  <p className="text-gray-300 text-sm">
                    All other {useSocialistTheme ? "comrades" : "players"} pay you 2M.
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h4 className="font-semibold text-white mb-1">Just Say No</h4>
                  <p className="text-gray-300 text-sm">
                    Cancel any {useSocialistTheme ? "directive" : "action"} card played against you. Can be chained!
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h4 className="font-semibold text-white mb-1">
                    Double the {useSocialistTheme ? "Levy" : "Rent"}
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Play with a {useSocialistTheme ? "levy" : "rent"} card to double the {useSocialistTheme ? "levy" : "rent"} amount. Can stack 2
                    cards for 4x {useSocialistTheme ? "levy" : "rent"}!
                  </p>
                </div>
              </div>
            </section>

            {/* Payment Rules */}
            <section>
              <h3 className="text-2xl font-bold text-emerald-400 mb-3">
                Payment Rules
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>
                    The{" "}
                    <span className="font-bold text-white">paying {useSocialistTheme ? "comrade" : "player"}</span>{" "}
                    decides which cards to use for payment
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>
                    You can only pay with cards{" "}
                    <span className="font-bold text-white">on the table</span>,
                    not from your hand
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>
                    <span className="font-bold text-white">
                      Money/{useSocialistTheme ? "directive" : "action"} cards
                    </span>{" "}
                    go to the recipient's bank
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>
                    <span className="font-bold text-white">Property cards</span>{" "}
                    go to the recipient's property area
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>
                    <span className="font-bold text-white">
                      No change is given
                    </span>{" "}
                    — overpayment goes to the recipient
                  </span>
                </li>
              </ul>
            </section>

            {/* Wildcards */}
            <section>
              <h3 className="text-2xl font-bold text-emerald-400 mb-3">
                Property Wildcards
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>
                    <span className="font-bold text-white">
                      Dual-color wildcards
                    </span>{" "}
                    can be either of the two colors shown
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>
                    <span className="font-bold text-white">
                      Multi-color wildcards
                    </span>{" "}
                    can represent any color
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>
                    Wildcards can be{" "}
                    <span className="font-bold text-white">
                      moved between your property sets during your turn
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>
                    Multi-color wildcards have{" "}
                    <span className="font-bold text-white">
                      no monetary value
                    </span>{" "}
                    and cannot be used for payment
                  </span>
                </li>
              </ul>
            </section>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700">
            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
            >
              Got it!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
