import { useEffect, useRef, useState, useCallback } from "react";

const MUSIC_TRACKS = [
  "/api/assets/mp3/soundtracks/casino-vip-music-minimal-casino-background-1-469423.mp3",
  "/api/assets/mp3/soundtracks/casino-vip-music-minimal-casino-background-10-469436.mp3",
  "/api/assets/mp3/soundtracks/casino-vip-music-minimal-casino-background-2-469424.mp3",
  "/api/assets/mp3/soundtracks/casino-vip-music-minimal-casino-background-3-469425.mp3",
  "/api/assets/mp3/soundtracks/casino-vip-music-minimal-casino-background-4-469426.mp3",
  "/api/assets/mp3/soundtracks/casino-vip-music-minimal-casino-background-5-469428.mp3",
  "/api/assets/mp3/soundtracks/casino-vip-music-minimal-casino-background-6-469429.mp3",
  "/api/assets/mp3/soundtracks/casino-vip-music-minimal-casino-background-7-469430.mp3",
  "/api/assets/mp3/soundtracks/casino-vip-music-minimal-casino-background-8-469431.mp3",
  "/api/assets/mp3/soundtracks/casino-vip-music-minimal-casino-background-9-469435.mp3",
];

// Cache decoded audio buffers so we don't re-fetch on every track switch.
const bufferCache = new Map<string, AudioBuffer>();

async function loadTrack(
  ctx: AudioContext,
  url: string,
): Promise<AudioBuffer> {
  const cached = bufferCache.get(url);
  if (cached) return cached;

  const resp = await fetch(url);
  const arrayBuf = await resp.arrayBuffer();
  const audioBuf = await ctx.decodeAudioData(arrayBuf);
  bufferCache.set(url, audioBuf);
  return audioBuf;
}

export function useBackgroundMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() =>
    Math.floor(Math.random() * MUSIC_TRACKS.length),
  );
  const [volume, setVolume] = useState(0.3);

  // Playback position tracking for pause/resume.
  // `startedAt` = ctx.currentTime when we last called source.start().
  // `offset` = the position within the track where playback began.
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);

  // Stable ref so callbacks always see the latest track index.
  const trackIndexRef = useRef(currentTrackIndex);
  trackIndexRef.current = currentTrackIndex;

  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  // Generation counter — incremented every time playTrack is called.
  // After the async `loadTrack`, we bail out if the generation has
  // changed, preventing orphaned AudioBufferSourceNodes from playing.
  const playGenRef = useRef(0);

  // ── helpers ──────────────────────────────────────────────────────

  const getOrCreateCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      const gain = ctxRef.current.createGain();
      gain.gain.value = volume;
      gain.connect(ctxRef.current.destination);
      gainRef.current = gain;
    }
    return ctxRef.current;
  }, []); // volume is only the initial value; updates go via the effect below

  /** Stop the currently-playing source node (if any) without changing state. */
  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.onended = null; // detach to avoid re-triggering advance
        sourceRef.current.stop();
      } catch {
        /* already stopped */
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  /** Start playback of `trackUrl` from `offset` seconds. */
  const playTrack = useCallback(
    async (trackUrl: string, offset = 0) => {
      const ctx = getOrCreateCtx();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      stopSource();

      // Capture a generation token. If another playTrack call fires
      // while we await loadTrack, our token will be stale and we bail
      // out — preventing an orphaned source node from playing.
      const gen = ++playGenRef.current;

      try {
        const buffer = await loadTrack(ctx, trackUrl);

        // Stale call — a newer playTrack superseded us during the await.
        if (gen !== playGenRef.current) return;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gainRef.current!);

        // When the track ends naturally, advance to the next one.
        source.onended = () => {
          // Only advance if we didn't manually stop (pause / skip).
          if (sourceRef.current === source) {
            sourceRef.current = null;
            offsetRef.current = 0;
            setCurrentTrackIndex(
              (prev) => (prev + 1) % MUSIC_TRACKS.length,
            );
          }
        };

        source.start(0, offset);
        sourceRef.current = source;
        startedAtRef.current = ctx.currentTime;
        offsetRef.current = offset;
        setIsPlaying(true);
      } catch (err) {
        console.log("Music playback failed:", err);
        setIsPlaying(false);
      }
    },
    [getOrCreateCtx, stopSource],
  );

  // ── volume ───────────────────────────────────────────────────────

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }
  }, [volume]);

  // ── track changes ────────────────────────────────────────────────

  const prevTrackRef = useRef(currentTrackIndex);
  useEffect(() => {
    if (prevTrackRef.current === currentTrackIndex) return;
    prevTrackRef.current = currentTrackIndex;

    if (isPlayingRef.current) {
      // Playing → switch to the new track from the start.
      playTrack(MUSIC_TRACKS[currentTrackIndex], 0);
    }
  }, [currentTrackIndex, playTrack]);

  // ── visibility: pause when hidden, resume when visible ───────────

  useEffect(() => {
    let wasPlaying = false;
    let pausedOffset = 0;

    const onHide = () => {
      if (!isPlayingRef.current) return;
      wasPlaying = true;
      // Record where we are so we can resume later.
      const ctx = ctxRef.current;
      if (ctx) {
        pausedOffset =
          offsetRef.current + (ctx.currentTime - startedAtRef.current);
      }
      stopSource();
      setIsPlaying(false);
    };

    const onShow = () => {
      if (!wasPlaying) return;
      wasPlaying = false;
      playTrack(MUSIC_TRACKS[trackIndexRef.current], pausedOffset);
    };

    const onVisibility = () => {
      if (document.hidden) onHide();
      else onShow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onHide);
    window.addEventListener("focus", onShow);
    window.addEventListener("pagehide", onHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onHide);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("pagehide", onHide);
    };
  }, [playTrack, stopSource]);

  // ── cleanup on unmount ───────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopSource();
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, [stopSource]);

  // ── public API ───────────────────────────────────────────────────

  const startMusic = useCallback(() => {
    if (isPlayingRef.current) return; // already playing
    playTrack(MUSIC_TRACKS[trackIndexRef.current], 0);
  }, [playTrack]);

  const toggleMusic = useCallback(() => {
    if (isPlayingRef.current) {
      // Pause — record offset so we can resume.
      const ctx = ctxRef.current;
      if (ctx) {
        offsetRef.current += ctx.currentTime - startedAtRef.current;
      }
      stopSource();
      setIsPlaying(false);
    } else {
      playTrack(MUSIC_TRACKS[trackIndexRef.current], offsetRef.current);
    }
  }, [playTrack, stopSource]);

  const nextTrack = useCallback(() => {
    stopSource(); // silence the old track immediately
    offsetRef.current = 0;
    setCurrentTrackIndex((prev) => (prev + 1) % MUSIC_TRACKS.length);
  }, [stopSource]);

  const previousTrack = useCallback(() => {
    stopSource();
    offsetRef.current = 0;
    setCurrentTrackIndex(
      (prev) => (prev - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length,
    );
  }, [stopSource]);

  return {
    isPlaying,
    toggleMusic,
    nextTrack,
    previousTrack,
    startMusic,
    volume,
    setVolume,
    currentTrackIndex,
    totalTracks: MUSIC_TRACKS.length,
  };
}
