import { useEffect, useRef, useState } from "react";

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

export function useBackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    // Start with a random track
    return Math.floor(Math.random() * MUSIC_TRACKS.length);
  });
  const [volume, setVolume] = useState(0.3);
  const isInitializedRef = useRef(false);
  const hasAttemptedPlayRef = useRef(false);
  const initialTrackRef = useRef(currentTrackIndex);

  // Initialize audio on mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = false;
      audioRef.current.volume = volume;
      audioRef.current.src = MUSIC_TRACKS[initialTrackRef.current];

      audioRef.current.addEventListener("ended", () => {
        setCurrentTrackIndex((prev) => (prev + 1) % MUSIC_TRACKS.length);
      });

      isInitializedRef.current = true;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [volume]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Pause music when the page is hidden / loses focus, resume when
  // it comes back — but only if the user had it playing before.
  // Without this, a backgrounded tab keeps the audio element going
  // (annoying when the user has muted their phone but audio still
  // chews battery).
  useEffect(() => {
    const wasPlayingRef = { current: false };

    const onHide = () => {
      if (!audioRef.current) return;
      if (!audioRef.current.paused) {
        wasPlayingRef.current = true;
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
    const onShow = () => {
      if (!audioRef.current) return;
      if (wasPlayingRef.current) {
        wasPlayingRef.current = false;
        audioRef.current.play().then(
          () => setIsPlaying(true),
          () => {
            /* autoplay rejected — leave paused */
          },
        );
      }
    };
    const onVisibility = () => {
      if (document.hidden) onHide();
      else onShow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onHide);
    window.addEventListener("focus", onShow);
    // pagehide is fired on tab close + iOS Safari "swipe away"; pause
    // there too so we don't leave a dangling audio object running.
    window.addEventListener("pagehide", onHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onHide);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  // Handle track changes (but not initial mount or play/pause changes)
  useEffect(() => {
    if (!isInitializedRef.current || !audioRef.current) return;

    // Only change track if we're already playing
    if (isPlaying) {
      audioRef.current.src = MUSIC_TRACKS[currentTrackIndex];
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex, isPlaying]);

  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Resume playing (don't change src)
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const nextTrack = () => {
    if (!audioRef.current) return;
    setCurrentTrackIndex((prev) => (prev + 1) % MUSIC_TRACKS.length);
  };

  const previousTrack = () => {
    if (!audioRef.current) return;
    setCurrentTrackIndex(
      (prev) => (prev - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length,
    );
  };

  const startMusic = () => {
    if (!audioRef.current) return;
    if (hasAttemptedPlayRef.current) return; // Only try once

    hasAttemptedPlayRef.current = true;

    // Ensure audio is ready with the initial random track
    if (!audioRef.current.src) {
      audioRef.current.src = MUSIC_TRACKS[initialTrackRef.current];
    }

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((error) => {
        console.log("Music autoplay blocked:", error);
        setIsPlaying(false);
      });
  };

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
