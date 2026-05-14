// useSoundManager — sfx + theme picker, powered by @web-kits/audio.
//
// Sounds are declarative defineSound() patches and the player can
// choose between several "sound themes" in settings. The settings
// store persists the choice.
//
// All call sites use the same `play("cardPlay")` API.

import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defineSound } from "@web-kits/audio";

// ── Settings store ──────────────────────────────────────────────────

export const SOUND_THEMES = [
  "classic",
  "soft",
  "arcade",
  "chiptune",
  "bell",
  "synthwave",
  "pulse",
  "hum",
  "crispy",
] as const;
export type SoundTheme = (typeof SOUND_THEMES)[number];

export const SOUND_THEME_LABEL: Record<SoundTheme, string> = {
  classic: "Classic",
  soft: "Soft",
  arcade: "Arcade",
  chiptune: "Chiptune",
  bell: "Bell",
  synthwave: "Synthwave",
  pulse: "Pulse",
  hum: "Hum",
  crispy: "Crispy",
};

export const SOUND_THEME_HINT: Record<SoundTheme, string> = {
  classic: "",
  soft: "",
  arcade: "",
  chiptune: "",
  bell: "",
  synthwave: "",
  pulse: "",
  hum: "",
  crispy: "",
};

interface SoundSettings {
  sfxEnabled: boolean;
  sfxVolume: number;
  soundTheme: SoundTheme;
  hapticsEnabled: boolean;
  toggleSfx: () => void;
  toggleHaptics: () => void;
  setSfxVolume: (v: number) => void;
  setSoundTheme: (t: SoundTheme) => void;
}

export const useSoundSettings = create<SoundSettings>()(
  persist(
    (set) => ({
      sfxEnabled: true,
      sfxVolume: 0.5,
      soundTheme: "hum",
      hapticsEnabled: true,
      toggleSfx: () => set((s) => ({ sfxEnabled: !s.sfxEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
      setSfxVolume: (v) => set({ sfxVolume: v }),
      setSoundTheme: (t) => set({ soundTheme: t }),
    }),
    { name: "coopoly-sound-settings" },
  ),
);

// ── Sound effects ──────────────────────────────────────────────────

export type SoundEffect =
  | "cardPlay"
  | "cardDraw"
  | "cardSlide"
  | "turnStart"
  | "actionPlayed"
  | "justSayNo"
  | "payment"
  | "setComplete"
  | "gameWin"
  | "gameLose"
  | "error"
  | "buttonClick"
  | "playerJoin"
  | "rent"
  | "steal"
  | "tick";

/**
 * @web-kits/audio's defineSound returns a () => void player. We wrap
 * the patch in a small helper so themes can compose multi-part sounds
 * (e.g. two notes with a setTimeout between them) without each entry
 * having to spell that out.
 */
type SoundPlayer = () => void;
type SoundDef = SoundPlayer | { sequence: { player: SoundPlayer; delay: number }[] };

function play(def: SoundDef) {
  if (typeof def === "function") {
    def();
    return;
  }
  for (const step of def.sequence) {
    if (step.delay <= 0) step.player();
    else setTimeout(step.player, step.delay);
  }
}

// Tiny helpers: build a one-shot from a frequency sweep + decay.
function tone(opts: {
  freqStart: number;
  freqEnd?: number;
  decay?: number;
  gain?: number;
  type?: "sine" | "square" | "triangle" | "sawtooth";
}): SoundPlayer {
  const {
    freqStart,
    freqEnd = freqStart,
    decay = 0.1,
    gain = 0.3,
    type = "sine",
  } = opts;
  return defineSound({
    source: { type, frequency: { start: freqStart, end: freqEnd } },
    envelope: { decay },
    gain,
  });
}

function chime(freqs: number[], spacing = 0.1, gain = 0.3, decay = 0.18): SoundDef {
  return {
    sequence: freqs.map((f, i) => ({
      player: tone({ freqStart: f, decay, gain, type: "sine" }),
      delay: i * spacing * 1000,
    })),
  };
}

// ── Theme: Classic (matches the original feel) ────────────────────

const classic: Record<SoundEffect, SoundDef> = {
  cardPlay: {
    sequence: [
      { player: tone({ freqStart: 800, decay: 0.08, gain: 0.15, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 1000, decay: 0.08, gain: 0.1, type: "square" }), delay: 50 },
    ],
  },
  cardDraw: tone({ freqStart: 600, decay: 0.1, gain: 0.2, type: "triangle" }),
  cardSlide: {
    sequence: [
      { player: tone({ freqStart: 400, decay: 0.06, gain: 0.1, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 500, decay: 0.06, gain: 0.08, type: "sawtooth" }), delay: 40 },
    ],
  },
  turnStart: chime([523, 659, 784], 0.12, 0.25),
  actionPlayed: {
    sequence: [
      { player: tone({ freqStart: 440, decay: 0.15, gain: 0.2, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 554, decay: 0.15, gain: 0.15, type: "square" }), delay: 100 },
    ],
  },
  justSayNo: {
    sequence: [
      { player: tone({ freqStart: 300, decay: 0.2, gain: 0.25, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 200, decay: 0.3, gain: 0.2, type: "sawtooth" }), delay: 150 },
    ],
  },
  payment: chime([330, 415, 523], 0.08, 0.2),
  setComplete: chime([523, 659, 784, 1047], 0.1, 0.3),
  gameWin: chime([523, 659, 784, 1047, 1319], 0.15, 0.35),
  gameLose: {
    sequence: [
      { player: tone({ freqStart: 300, decay: 0.3, gain: 0.2, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 250, decay: 0.3, gain: 0.15, type: "sawtooth" }), delay: 200 },
      { player: tone({ freqStart: 200, decay: 0.5, gain: 0.1, type: "sawtooth" }), delay: 400 },
    ],
  },
  error: {
    sequence: [
      { player: tone({ freqStart: 200, decay: 0.15, gain: 0.2, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 150, decay: 0.2, gain: 0.15, type: "square" }), delay: 100 },
    ],
  },
  buttonClick: tone({ freqStart: 1200, decay: 0.04, gain: 0.15 }),
  playerJoin: chime([440, 554], 0.15, 0.2),
  rent: {
    sequence: [
      { player: tone({ freqStart: 350, decay: 0.15, gain: 0.2, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 440, decay: 0.15, gain: 0.2, type: "square" }), delay: 100 },
      { player: tone({ freqStart: 350, decay: 0.15, gain: 0.2, type: "square" }), delay: 200 },
    ],
  },
  steal: {
    sequence: [
      { player: tone({ freqStart: 200, decay: 0.1, gain: 0.2, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 400, decay: 0.1, gain: 0.2, type: "sawtooth" }), delay: 80 },
      { player: tone({ freqStart: 600, decay: 0.15, gain: 0.15, type: "sawtooth" }), delay: 160 },
    ],
  },
  tick: tone({ freqStart: 800, decay: 0.05, gain: 0.1 }),
};

// ── Theme: Soft (mellow sine chimes) ─────────────────────────────

const soft: Record<SoundEffect, SoundDef> = {
  cardPlay: tone({ freqStart: 660, freqEnd: 880, decay: 0.18, gain: 0.18 }),
  cardDraw: tone({ freqStart: 523, freqEnd: 659, decay: 0.22, gain: 0.18 }),
  cardSlide: tone({ freqStart: 440, decay: 0.14, gain: 0.14 }),
  turnStart: chime([392, 523, 659], 0.16, 0.22, 0.3),
  actionPlayed: chime([440, 554], 0.12, 0.22, 0.25),
  justSayNo: tone({ freqStart: 392, freqEnd: 220, decay: 0.4, gain: 0.22 }),
  payment: chime([330, 415, 523], 0.1, 0.18, 0.25),
  setComplete: chime([523, 659, 784, 1047], 0.13, 0.26, 0.3),
  gameWin: chime([523, 659, 784, 1047, 1319, 1568], 0.18, 0.3, 0.4),
  gameLose: tone({ freqStart: 350, freqEnd: 175, decay: 0.8, gain: 0.18 }),
  error: tone({ freqStart: 220, freqEnd: 165, decay: 0.25, gain: 0.18 }),
  buttonClick: tone({ freqStart: 880, decay: 0.06, gain: 0.12 }),
  playerJoin: chime([440, 554, 659], 0.13, 0.18, 0.25),
  rent: chime([330, 415, 330], 0.15, 0.22, 0.25),
  steal: chime([220, 330, 440], 0.1, 0.2, 0.2),
  tick: tone({ freqStart: 1047, decay: 0.04, gain: 0.08 }),
};

// ── Theme: Arcade (aggressive saw/square) ────────────────────────

const arcade: Record<SoundEffect, SoundDef> = {
  cardPlay: tone({ freqStart: 1000, freqEnd: 1200, decay: 0.06, gain: 0.18, type: "square" }),
  cardDraw: tone({ freqStart: 800, freqEnd: 1100, decay: 0.06, gain: 0.18, type: "square" }),
  cardSlide: tone({ freqStart: 600, freqEnd: 400, decay: 0.05, gain: 0.16, type: "sawtooth" }),
  turnStart: {
    sequence: [
      { player: tone({ freqStart: 660, freqEnd: 880, decay: 0.08, gain: 0.22, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 880, freqEnd: 1320, decay: 0.1, gain: 0.22, type: "square" }), delay: 80 },
    ],
  },
  actionPlayed: {
    sequence: [
      { player: tone({ freqStart: 440, decay: 0.08, gain: 0.22, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 660, decay: 0.08, gain: 0.22, type: "sawtooth" }), delay: 60 },
      { player: tone({ freqStart: 880, decay: 0.1, gain: 0.22, type: "sawtooth" }), delay: 120 },
    ],
  },
  justSayNo: {
    sequence: [
      { player: tone({ freqStart: 200, decay: 0.1, gain: 0.28, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 150, decay: 0.16, gain: 0.24, type: "sawtooth" }), delay: 80 },
      { player: tone({ freqStart: 110, decay: 0.22, gain: 0.2, type: "sawtooth" }), delay: 160 },
    ],
  },
  payment: chime([440, 660, 880], 0.06, 0.22, 0.12),
  setComplete: {
    sequence: [
      { player: tone({ freqStart: 523, decay: 0.08, gain: 0.26, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 659, decay: 0.08, gain: 0.26, type: "square" }), delay: 80 },
      { player: tone({ freqStart: 784, decay: 0.08, gain: 0.26, type: "square" }), delay: 160 },
      { player: tone({ freqStart: 1047, decay: 0.16, gain: 0.3, type: "square" }), delay: 240 },
    ],
  },
  gameWin: {
    sequence: [
      { player: tone({ freqStart: 523, decay: 0.1, gain: 0.3, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 659, decay: 0.1, gain: 0.3, type: "square" }), delay: 100 },
      { player: tone({ freqStart: 784, decay: 0.1, gain: 0.3, type: "square" }), delay: 200 },
      { player: tone({ freqStart: 1047, decay: 0.15, gain: 0.3, type: "square" }), delay: 300 },
      { player: tone({ freqStart: 1319, decay: 0.25, gain: 0.32, type: "square" }), delay: 450 },
    ],
  },
  gameLose: {
    sequence: [
      { player: tone({ freqStart: 220, decay: 0.18, gain: 0.24, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 175, decay: 0.22, gain: 0.22, type: "sawtooth" }), delay: 200 },
      { player: tone({ freqStart: 110, decay: 0.4, gain: 0.18, type: "sawtooth" }), delay: 420 },
    ],
  },
  error: tone({ freqStart: 165, freqEnd: 110, decay: 0.18, gain: 0.24, type: "square" }),
  buttonClick: tone({ freqStart: 1500, decay: 0.03, gain: 0.16, type: "square" }),
  playerJoin: chime([440, 660, 880], 0.08, 0.2, 0.1),
  rent: {
    sequence: [
      { player: tone({ freqStart: 330, decay: 0.08, gain: 0.22, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 440, decay: 0.08, gain: 0.22, type: "sawtooth" }), delay: 80 },
      { player: tone({ freqStart: 587, decay: 0.12, gain: 0.22, type: "sawtooth" }), delay: 160 },
    ],
  },
  steal: {
    sequence: [
      { player: tone({ freqStart: 110, decay: 0.06, gain: 0.22, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 220, decay: 0.06, gain: 0.22, type: "sawtooth" }), delay: 60 },
      { player: tone({ freqStart: 440, decay: 0.06, gain: 0.22, type: "sawtooth" }), delay: 120 },
      { player: tone({ freqStart: 880, decay: 0.12, gain: 0.18, type: "sawtooth" }), delay: 180 },
    ],
  },
  tick: tone({ freqStart: 660, decay: 0.04, gain: 0.12, type: "square" }),
};

// ── Theme: Chiptune (8-bit beeps) ────────────────────────────────

const chiptune: Record<SoundEffect, SoundDef> = {
  cardPlay: tone({ freqStart: 880, freqEnd: 660, decay: 0.05, gain: 0.16, type: "square" }),
  cardDraw: tone({ freqStart: 440, freqEnd: 880, decay: 0.06, gain: 0.16, type: "square" }),
  cardSlide: tone({ freqStart: 220, freqEnd: 110, decay: 0.05, gain: 0.14, type: "triangle" }),
  turnStart: chime([523, 784, 1047], 0.06, 0.2, 0.05),
  actionPlayed: {
    sequence: [
      { player: tone({ freqStart: 1047, decay: 0.04, gain: 0.2, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 1319, decay: 0.04, gain: 0.2, type: "square" }), delay: 50 },
      { player: tone({ freqStart: 1568, decay: 0.06, gain: 0.2, type: "square" }), delay: 100 },
    ],
  },
  justSayNo: {
    sequence: [
      { player: tone({ freqStart: 165, decay: 0.06, gain: 0.22, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 110, decay: 0.1, gain: 0.2, type: "square" }), delay: 70 },
    ],
  },
  payment: chime([523, 784, 1047], 0.05, 0.18, 0.06),
  setComplete: chime([523, 659, 784, 1047, 1319], 0.06, 0.22, 0.06),
  gameWin: chime([523, 659, 784, 1047, 1319, 1568, 2093], 0.08, 0.24, 0.06),
  gameLose: chime([330, 277, 220, 165], 0.15, 0.2, 0.18),
  error: tone({ freqStart: 110, decay: 0.1, gain: 0.22, type: "square" }),
  buttonClick: tone({ freqStart: 1568, decay: 0.02, gain: 0.14, type: "square" }),
  playerJoin: chime([523, 1047], 0.06, 0.18, 0.05),
  rent: {
    sequence: [
      { player: tone({ freqStart: 440, decay: 0.04, gain: 0.2, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 660, decay: 0.04, gain: 0.2, type: "square" }), delay: 50 },
      { player: tone({ freqStart: 880, decay: 0.08, gain: 0.2, type: "square" }), delay: 100 },
    ],
  },
  steal: {
    sequence: [
      { player: tone({ freqStart: 165, decay: 0.04, gain: 0.18, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 330, decay: 0.04, gain: 0.18, type: "square" }), delay: 50 },
      { player: tone({ freqStart: 660, decay: 0.04, gain: 0.18, type: "square" }), delay: 100 },
      { player: tone({ freqStart: 1320, decay: 0.06, gain: 0.16, type: "square" }), delay: 150 },
    ],
  },
  tick: tone({ freqStart: 1047, decay: 0.02, gain: 0.1, type: "square" }),
};

// ── Theme: Bell (FM sine, long resonant decays) ─────────────────

const bell: Record<SoundEffect, SoundDef> = {
  cardPlay: tone({ freqStart: 1320, decay: 0.6, gain: 0.16 }),
  cardDraw: tone({ freqStart: 880, decay: 0.5, gain: 0.16 }),
  cardSlide: tone({ freqStart: 660, decay: 0.4, gain: 0.12 }),
  turnStart: chime([523, 784, 1175], 0.18, 0.22, 0.5),
  actionPlayed: chime([880, 1175], 0.14, 0.22, 0.5),
  justSayNo: tone({ freqStart: 392, freqEnd: 196, decay: 0.7, gain: 0.18 }),
  payment: chime([523, 784, 1047], 0.14, 0.2, 0.5),
  setComplete: chime([523, 784, 1047, 1568], 0.16, 0.24, 0.55),
  gameWin: chime([523, 659, 784, 1047, 1319, 1568, 2093], 0.16, 0.26, 0.6),
  gameLose: tone({ freqStart: 392, freqEnd: 131, decay: 1.5, gain: 0.16 }),
  error: chime([220, 175], 0.12, 0.18, 0.4),
  buttonClick: tone({ freqStart: 1568, decay: 0.18, gain: 0.1 }),
  playerJoin: chime([784, 1047], 0.14, 0.18, 0.5),
  rent: chime([523, 392, 523], 0.14, 0.2, 0.45),
  steal: chime([262, 392, 523, 784], 0.1, 0.2, 0.4),
  tick: tone({ freqStart: 1568, decay: 0.12, gain: 0.08 }),
};

// ── Theme: Synthwave (detuned saws + retro 80s feel) ────────────

const synthwave: Record<SoundEffect, SoundDef> = {
  cardPlay: tone({ freqStart: 880, freqEnd: 660, decay: 0.18, gain: 0.18, type: "sawtooth" }),
  cardDraw: tone({ freqStart: 440, freqEnd: 880, decay: 0.18, gain: 0.18, type: "sawtooth" }),
  cardSlide: tone({ freqStart: 330, freqEnd: 220, decay: 0.14, gain: 0.16, type: "sawtooth" }),
  turnStart: chime([392, 587, 784], 0.14, 0.22, 0.3),
  actionPlayed: {
    sequence: [
      { player: tone({ freqStart: 440, decay: 0.18, gain: 0.22, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 660, decay: 0.18, gain: 0.22, type: "sawtooth" }), delay: 100 },
    ],
  },
  justSayNo: tone({ freqStart: 220, freqEnd: 110, decay: 0.5, gain: 0.22, type: "sawtooth" }),
  payment: chime([330, 415, 523], 0.12, 0.2, 0.3),
  setComplete: chime([523, 659, 784, 1047], 0.14, 0.24, 0.35),
  gameWin: chime([392, 523, 659, 784, 1047, 1319], 0.18, 0.28, 0.4),
  gameLose: {
    sequence: [
      { player: tone({ freqStart: 330, decay: 0.5, gain: 0.22, type: "sawtooth" }), delay: 0 },
      { player: tone({ freqStart: 220, decay: 0.6, gain: 0.18, type: "sawtooth" }), delay: 250 },
      { player: tone({ freqStart: 110, decay: 0.9, gain: 0.16, type: "sawtooth" }), delay: 500 },
    ],
  },
  error: tone({ freqStart: 175, freqEnd: 87, decay: 0.3, gain: 0.22, type: "sawtooth" }),
  buttonClick: tone({ freqStart: 880, decay: 0.05, gain: 0.14, type: "sawtooth" }),
  playerJoin: chime([392, 523, 784], 0.13, 0.2, 0.3),
  rent: chime([330, 415, 523], 0.13, 0.22, 0.3),
  steal: chime([165, 247, 330, 494], 0.1, 0.22, 0.3),
  tick: tone({ freqStart: 660, decay: 0.05, gain: 0.1, type: "sawtooth" }),
};

// ── Theme: Pulse (minimal short pings, almost ambient) ──────────

const pulse: Record<SoundEffect, SoundDef> = {
  cardPlay: tone({ freqStart: 1568, decay: 0.05, gain: 0.1 }),
  cardDraw: tone({ freqStart: 1175, decay: 0.05, gain: 0.1 }),
  cardSlide: tone({ freqStart: 880, decay: 0.04, gain: 0.08 }),
  turnStart: chime([1175, 1568], 0.08, 0.12, 0.1),
  actionPlayed: chime([1568, 2093], 0.08, 0.14, 0.08),
  justSayNo: chime([523, 392], 0.1, 0.14, 0.12),
  payment: chime([1047, 1568], 0.06, 0.12, 0.08),
  setComplete: chime([1175, 1568, 2093], 0.07, 0.14, 0.1),
  gameWin: chime([1047, 1568, 2093, 2637], 0.08, 0.16, 0.12),
  gameLose: chime([523, 392, 262], 0.18, 0.14, 0.18),
  error: chime([262, 196], 0.06, 0.14, 0.08),
  buttonClick: tone({ freqStart: 2093, decay: 0.02, gain: 0.08 }),
  playerJoin: chime([1175, 1568], 0.08, 0.12, 0.08),
  rent: chime([880, 1175, 880], 0.08, 0.12, 0.1),
  steal: chime([523, 880, 1175], 0.06, 0.12, 0.08),
  tick: tone({ freqStart: 2093, decay: 0.015, gain: 0.06 }),
};

// ── Theme: Hum (low triangle drones with long fades) ────────────

const hum: Record<SoundEffect, SoundDef> = {
  cardPlay: tone({ freqStart: 220, decay: 0.4, gain: 0.16, type: "triangle" }),
  cardDraw: tone({ freqStart: 175, decay: 0.45, gain: 0.16, type: "triangle" }),
  cardSlide: tone({ freqStart: 147, decay: 0.35, gain: 0.14, type: "triangle" }),
  turnStart: chime([196, 247, 294], 0.18, 0.2, 0.4),
  actionPlayed: chime([220, 277], 0.16, 0.2, 0.4),
  justSayNo: tone({ freqStart: 196, freqEnd: 98, decay: 0.7, gain: 0.2, type: "triangle" }),
  payment: chime([165, 196, 247], 0.16, 0.2, 0.4),
  setComplete: chime([196, 247, 294, 392], 0.18, 0.22, 0.45),
  gameWin: chime([196, 247, 294, 392, 494], 0.22, 0.24, 0.5),
  gameLose: tone({ freqStart: 165, freqEnd: 65, decay: 1.4, gain: 0.18, type: "triangle" }),
  error: chime([110, 87], 0.18, 0.2, 0.35),
  buttonClick: tone({ freqStart: 330, decay: 0.1, gain: 0.1, type: "triangle" }),
  playerJoin: chime([220, 294], 0.16, 0.18, 0.4),
  rent: chime([196, 220, 196], 0.18, 0.2, 0.4),
  steal: chime([110, 165, 220, 294], 0.13, 0.2, 0.35),
  tick: tone({ freqStart: 392, decay: 0.08, gain: 0.08, type: "triangle" }),
};

// ── Theme: Crispy (bright high-freq snaps) ──────────────────────

const crispy: Record<SoundEffect, SoundDef> = {
  cardPlay: tone({ freqStart: 2637, freqEnd: 1568, decay: 0.04, gain: 0.14, type: "square" }),
  cardDraw: tone({ freqStart: 1568, freqEnd: 2637, decay: 0.05, gain: 0.14, type: "square" }),
  cardSlide: tone({ freqStart: 1175, decay: 0.04, gain: 0.12, type: "triangle" }),
  turnStart: chime([1568, 2093, 2637], 0.06, 0.2, 0.08),
  actionPlayed: {
    sequence: [
      { player: tone({ freqStart: 2093, decay: 0.04, gain: 0.18, type: "square" }), delay: 0 },
      { player: tone({ freqStart: 2637, decay: 0.04, gain: 0.18, type: "square" }), delay: 50 },
      { player: tone({ freqStart: 3136, decay: 0.06, gain: 0.18, type: "square" }), delay: 100 },
    ],
  },
  justSayNo: chime([1175, 880], 0.08, 0.2, 0.14),
  payment: chime([1568, 2093, 2637], 0.05, 0.18, 0.06),
  setComplete: chime([1568, 2093, 2637, 3136], 0.06, 0.22, 0.06),
  gameWin: chime([1568, 2093, 2637, 3136, 3951], 0.08, 0.22, 0.08),
  gameLose: chime([1175, 880, 660, 440], 0.12, 0.18, 0.16),
  error: chime([523, 440], 0.08, 0.2, 0.1),
  buttonClick: tone({ freqStart: 3136, decay: 0.02, gain: 0.12, type: "square" }),
  playerJoin: chime([2093, 2637], 0.06, 0.18, 0.06),
  rent: chime([1568, 2093, 2637], 0.06, 0.2, 0.06),
  steal: chime([880, 1320, 2093, 2637], 0.06, 0.2, 0.06),
  tick: tone({ freqStart: 3136, decay: 0.02, gain: 0.08, type: "square" }),
};

const THEMES: Record<SoundTheme, Record<SoundEffect, SoundDef>> = {
  classic,
  soft,
  arcade,
  chiptune,
  bell,
  synthwave,
  pulse,
  hum,
  crispy,
};

// ── Preview helper (non-hook) ─────────────────────────────────────
// Plays a single effect from a SPECIFIC theme without going through
// the React-memoized `play` returned by useSoundManager. Use this for
// previews where the user has just clicked a theme chip — the
// hook-based play would otherwise be one render "behind" because its
// useCallback captures the previous theme value (the chip click
// schedules play() in a setTimeout / event handler whose closure
// captures the now-stale callback).
export function previewSound(theme: SoundTheme, effect: SoundEffect) {
  try {
    const set = THEMES[theme] ?? THEMES.classic;
    play(set[effect]);
  } catch {
    // AudioContext may not be initialized yet (no user gesture).
  }
}

// ── Hook ───────────────────────────────────────────────────────────

export function useSoundManager() {
  const sfxEnabled = useSoundSettings((s) => s.sfxEnabled);
  const soundTheme = useSoundSettings((s) => s.soundTheme);

  const trigger = useCallback(
    (effect: SoundEffect) => {
      if (!sfxEnabled) return;
      try {
        const set = THEMES[soundTheme] ?? THEMES.classic;
        play(set[effect]);
      } catch {
        // AudioContext may not be initialized yet (no user gesture).
      }
    },
    [sfxEnabled, soundTheme],
  );

  return { play: trigger };
}
