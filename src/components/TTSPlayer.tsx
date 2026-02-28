import { useState, useRef, useEffect } from "react";
import { Play, Square, Loader2 } from "lucide-react";

interface TTSPlayerProps {
  text: string;
  onEnded?: () => void;
  id?: string;
}

// Global reference to the currently playing audio element across all mounted TTSPlayer components
export let activeAudio: HTMLAudioElement | null = null;
export let activeSetIsPlaying: ((playing: boolean) => void) | null = null;

// Helper to set global state
export const setGlobalAudio = (
  audio: HTMLAudioElement | null,
  setPlaying: ((playing: boolean) => void) | null,
) => {
  activeAudio = audio;
  activeSetIsPlaying = setPlaying;
};

export default function TTSPlayer({ text, onEnded, id }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup audio element on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        if (activeAudio === audioRef.current) {
          activeAudio = null;
          activeSetIsPlaying = null;
        }
      }
    };
  }, []);

  const togglePlay = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (activeAudio === audioRef.current) {
        activeAudio = null;
        activeSetIsPlaying = null;
      }
      return;
    }

    // Stop any globally playing audio first
    if (activeAudio && activeSetIsPlaying && activeAudio !== audioRef.current) {
      activeAudio.pause();
      activeSetIsPlaying(false);
    }

    // If source already exists and isn't empty, just resume
    if (
      audioRef.current &&
      audioRef.current.src &&
      audioRef.current.src !== window.location.href
    ) {
      audioRef.current.play();
      setIsPlaying(true);

      activeAudio = audioRef.current;
      activeSetIsPlaying = setIsPlaying;
      return;
    }

    setIsLoading(true);

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const voice = localStorage.getItem("preferred-tts-voice");

      // We attach the URL query search parameter for the text we want synthesized.
      // This will stream direct from the GET endpoint natively!
      const params = new URLSearchParams();
      params.append("text", text);
      if (voice) {
        params.append("voice", voice);
      }
      audioRef.current.src = `/api/tts?${params.toString()}`;

      audioRef.current.onended = () => {
        setIsPlaying(false);
        if (activeAudio === audioRef.current) {
          activeAudio = null;
          activeSetIsPlaying = null;
        }
        // Reset the source so that if we play again, it requests fresh
        if (audioRef.current) audioRef.current.src = "";

        // Notify parent that playback finished
        if (onEnded) {
          onEnded();
        }
      };

      // Wait for it to start buffering enough to play
      await audioRef.current.play();
      setIsPlaying(true);

      activeAudio = audioRef.current;
      activeSetIsPlaying = setIsPlaying;
    } catch (err) {
      console.error("Failed to play audio stream:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      id={id}
      onClick={togglePlay}
      disabled={isLoading}
      className={`btn-icon-clear ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{
        padding: "8px",
        height: "36px",
        width: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: isPlaying ? "var(--accent-color)" : "var(--text-muted)",
        transition: "color 0.2s ease, transform 0.1s ease",
      }}
      aria-label={isPlaying ? "Stop Read Aloud" : "Play Read Aloud"}
      title={isPlaying ? "Stop Read Aloud" : "Play Read Aloud"}
    >
      {isLoading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : isPlaying ? (
        <Square size={18} fill="currentColor" />
      ) : (
        <Play size={18} fill="currentColor" />
      )}
    </button>
  );
}
