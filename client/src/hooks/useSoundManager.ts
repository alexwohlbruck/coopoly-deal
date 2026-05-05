// useSoundManager — sfx + theme picker, powered by @web-kits/audio.
//
// The legacy version hand-rolled oscillators in Web Audio. Now sounds
// are declarative defineSound() patches and the player can choose
// between several "sound themes" in settings (classic / soft / arcade
// / chiptune). The settings store persists the choice.
//
// All call sites still use the same `play("cardPlay")` API — only the
// implementation changed. The optional second arg lets callers
// override the theme one-off (rare).

import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defineSound } from "@web-kits/audio";

// ── Settings store ──────────────────────────────────────────────────

export const SOUND_THEMES = ["classic", "soft", "arcade", "chiptune"] as const;
export type SoundTheme = (typeof SOUND_THEMES)[number];

export const SOUND_THEME_LABEL: Record<SoundTheme, string> = {
  classic: "Classic",
  soft: "Soft",
  arcade: "Arcade",
  chiptune: "Chiptune",
};

export const SOUND_THEME_HINT: Record<SoundTheme, string> = {
  classic: "Punchy square-wave clicks. The default.",
  soft: "Mellow sine chimes for a quieter table.",
  arcade: "Aggressive saw-wave tones with bite.",
  chiptune: "8-bit beeps and bloops — a console-game feel.",
};

interface SoundSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  sfxVolume: number;
  musicVolume: number;
  soundTheme: SoundTheme;
  hapticsEnabled: boolean;
  toggleSfx: () => void;
  toggleMusic: () => void;
  toggleHaptics: () => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setSoundTheme: (t: SoundTheme) => void;
}

export const useSoundSettings = create<SoundSettings>()(
  persist(
    (set) => ({
      sfxEnabled: true,
      musicEnabled: false,
      sfxVolume: 0.5,
      musicVolume: 0.2,
      soundTheme: "classic",
      hapticsEnabled: true,
      toggleSfx: () => set((s) => ({ sfxEnabled: !s.sfxEnabled })),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
      setSfxVolume: (v) => set({ sfxVolume: v }),
      setMusicVolume: (v) => set({ musicVolume: v }),
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

const THEMES: Record<SoundTheme, Record<SoundEffect, SoundDef>> = {
  classic,
  soft,
  arcade,
  chiptune,
};

// ── Background music (unchanged from before) ─────────────────────

let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

let musicOscillators: OscillatorNode[] = [];
let musicGainNode: GainNode | null = null;
let musicPlaying = false;

export function startBackgroundMusic(volume: number = 0.1) {
  if (musicPlaying) return;
  const ctx = getAudioContext();
  musicGainNode = ctx.createGain();
  musicGainNode.gain.setValueAtTime(volume, ctx.currentTime);
  musicGainNode.connect(ctx.destination);

  const chords = [
    [261.63, 329.63, 392.0],
    [293.66, 369.99, 440.0],
    [349.23, 440.0, 523.25],
    [392.0, 493.88, 587.33],
  ];
  let chordIndex = 0;

  function playNextChord() {
    if (!musicPlaying || !musicGainNode) return;
    const c = getAudioContext();
    musicOscillators.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    musicOscillators = [];

    const chord = chords[chordIndex % chords.length];
    for (const freq of chord) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(0, c.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, c.currentTime + 0.5);
      gain.gain.linearRampToValueAtTime(0, c.currentTime + 3.8);
      osc.connect(gain);
      gain.connect(musicGainNode!);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 4);
      musicOscillators.push(osc);
    }
    chordIndex++;
    setTimeout(playNextChord, 4000);
  }

  musicPlaying = true;
  playNextChord();
}

export function stopBackgroundMusic() {
  musicPlaying = false;
  musicOscillators.forEach((o) => {
    try {
      o.stop();
    } catch {
      /* already stopped */
    }
  });
  musicOscillators = [];
  musicGainNode = null;
}

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
