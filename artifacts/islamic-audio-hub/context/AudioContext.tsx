import { Audio } from "expo-av";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useApp } from "./AppContext";
import type { Track } from "./AppContext";

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  queue: Track[];
  playlist: Track[];
  isExpanded: boolean;
  playTrack: (track: Track, playlist?: Track[]) => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  playNext: () => void;
  playPrev: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  setIsExpanded: (val: boolean) => void;
}

const AudioContext = createContext<AudioContextType>({} as AudioContextType);

const RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const { saveProgress, getProgress, addRecentTrack } = useApp();

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1.25);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
    });
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const startProgressTracking = useCallback(
    (trackId: string) => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      progressIntervalRef.current = setInterval(async () => {
        if (soundRef.current) {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            const secs = status.positionMillis / 1000;
            setCurrentTime(secs);
            saveProgress(trackId, secs);
          }
        }
      }, 1000);
    },
    [saveProgress],
  );

  const playTrack = useCallback(
    async (track: Track, newPlaylist?: Track[]) => {
      setIsLoading(true);
      setCurrentTrack(track);
      if (newPlaylist) setPlaylist(newPlaylist);

      await cleanup();

      try {
        const startSeconds = getProgress(track.id);
        const { sound } = await Audio.Sound.createAsync(
          { uri: track.audioUrl },
          {
            shouldPlay: true,
            rate: playbackRate,
            positionMillis: startSeconds * 1000,
          },
        );
        soundRef.current = sound;

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
            if (status.didJustFinish) {
              handleTrackEnd(track);
            }
          }
        });

        setIsPlaying(true);
        setCurrentTime(startSeconds);
        startProgressTracking(track.id);
        addRecentTrack(track);
      } catch (e) {
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    },
    [playbackRate, getProgress, startProgressTracking, addRecentTrack],
  );

  const handleTrackEnd = useCallback(
    (track: Track) => {
      if (queue.length > 0) {
        const [next, ...rest] = queue;
        setQueue(rest);
        playTrack(next, playlist);
      } else {
        const idx = playlist.findIndex((t) => t.id === track.id);
        if (idx >= 0 && idx < playlist.length - 1) {
          playTrack(playlist[idx + 1], playlist);
        } else {
          setIsPlaying(false);
        }
      }
    },
    [queue, playlist, playTrack],
  );

  const togglePlay = useCallback(async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, [isPlaying]);

  const seekTo = useCallback(async (seconds: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(seconds * 1000);
    setCurrentTime(seconds);
  }, []);

  const setPlaybackRate = useCallback(async (rate: number) => {
    setPlaybackRateState(rate);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(rate, true);
    }
  }, []);

  const playNext = useCallback(() => {
    if (!currentTrack) return;
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      playTrack(next, playlist);
    } else {
      const idx = playlist.findIndex((t) => t.id === currentTrack.id);
      if (idx >= 0 && idx < playlist.length - 1) {
        playTrack(playlist[idx + 1], playlist);
      }
    }
  }, [currentTrack, queue, playlist, playTrack]);

  const playPrev = useCallback(() => {
    if (!currentTrack) return;
    const idx = playlist.findIndex((t) => t.id === currentTrack.id);
    if (idx > 0) {
      playTrack(playlist[idx - 1], playlist);
    } else {
      seekTo(0);
    }
  }, [currentTrack, playlist, playTrack, seekTo]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        playbackRate,
        queue,
        playlist,
        isExpanded,
        playTrack,
        togglePlay,
        seekTo,
        setPlaybackRate,
        playNext,
        playPrev,
        addToQueue,
        removeFromQueue,
        setIsExpanded,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => useContext(AudioContext);
