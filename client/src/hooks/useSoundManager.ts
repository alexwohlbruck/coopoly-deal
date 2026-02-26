import { useCallback } from "react";
import { create } from "zustand";

interface SoundSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  sfxVolume: number;
  musicVolume: number;
  toggleSfx: () => void;
  toggleMusic: () => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
}

export const useSoundSettings = create<SoundSettings>((set) => ({
  sfxEnabled: true,
  musicEnabled: false,
  sfxVolume: 0.5,
  musicVolume: 0.2,
  toggleSfx: () => set((s) => ({ sfxEnabled: !s.sfxEnabled })),
  toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
  setSfxVolume: (v) => set({ sfxVolume: v }),
  setMusicVolume: (v) => set({ musicVolume: v }),
}));

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3,
) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

function playChime(
  notes: number[],
  spacing: number = 0.1,
  volume: number = 0.3,
) {
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, "sine", volume), i * spacing * 1000);
  });
}

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
  | "steal";

const soundMap: Record<SoundEffect, () => void> = {
  cardPlay: () => {
    playTone(800, 0.08, "square", 0.15);
    setTimeout(() => playTone(1000, 0.08, "square", 0.1), 50);
  },
  cardDraw: () => {
    playTone(600, 0.1, "triangle", 0.2);
  },
  cardSlide: () => {
    playTone(400, 0.06, "sawtooth", 0.1);
    setTimeout(() => playTone(500, 0.06, "sawtooth", 0.08), 40);
  },
  turnStart: () => {
    playChime([523, 659, 784], 0.12, 0.25);
  },
  actionPlayed: () => {
    playTone(440, 0.15, "square", 0.2);
    setTimeout(() => playTone(554, 0.15, "square", 0.15), 100);
  },
  justSayNo: () => {
    playTone(300, 0.2, "sawtooth", 0.25);
    setTimeout(() => playTone(200, 0.3, "sawtooth", 0.2), 150);
  },
  payment: () => {
    playChime([330, 415, 523], 0.08, 0.2);
  },
  setComplete: () => {
    playChime([523, 659, 784, 1047], 0.1, 0.3);
  },
  gameWin: () => {
    playChime([523, 659, 784, 1047, 1319], 0.15, 0.35);
  },
  gameLose: () => {
    playTone(300, 0.3, "sawtooth", 0.2);
    setTimeout(() => playTone(250, 0.3, "sawtooth", 0.15), 200);
    setTimeout(() => playTone(200, 0.5, "sawtooth", 0.1), 400);
  },
  error: () => {
    playTone(200, 0.15, "square", 0.2);
    setTimeout(() => playTone(150, 0.2, "square", 0.15), 100);
  },
  buttonClick: () => {
    playTone(1200, 0.04, "sine", 0.15);
  },
  playerJoin: () => {
    playChime([440, 554], 0.15, 0.2);
  },
  rent: () => {
    playTone(350, 0.15, "square", 0.2);
    setTimeout(() => playTone(440, 0.15, "square", 0.2), 100);
    setTimeout(() => playTone(350, 0.15, "square", 0.2), 200);
  },
  steal: () => {
    playTone(200, 0.1, "sawtooth", 0.2);
    setTimeout(() => playTone(400, 0.1, "sawtooth", 0.2), 80);
    setTimeout(() => playTone(600, 0.15, "sawtooth", 0.15), 160);
  },
};

// --- Background music ---

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

// --- Hook ---

export function useSoundManager() {
  const { sfxEnabled, sfxVolume } = useSoundSettings();

  const play = useCallback(
    (effect: SoundEffect) => {
      if (!sfxEnabled) return;
      try {
        soundMap[effect]();
      } catch {
        // AudioContext might not be initialized yet
      }
    },
    [sfxEnabled, sfxVolume],
  );

  return { play };
}
