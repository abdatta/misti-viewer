"use client";

import { useState, useEffect, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { Settings, Play, Square, Loader2 } from "lucide-react";
import {
  activeAudio,
  activeSetIsPlaying,
  setGlobalAudio,
} from "@/components/TTSPlayer";

type Voice = {
  Name: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  SuggestedCodec: string;
  FriendlyName: string;
  Status: string;
};

export default function SettingsPage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string>(
    "en-US-EmmaMultilingualNeural",
  );
  const [savedVoice, setSavedVoice] = useState<string>(
    "en-US-EmmaMultilingualNeural",
  );

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load saved voice
    const storedVoice = localStorage.getItem("preferred-tts-voice");
    if (storedVoice) {
      setSelectedVoice(storedVoice);
      setSavedVoice(storedVoice);
    }

    // Fetch available voices
    const fetchVoices = async () => {
      try {
        const res = await fetch("/api/tts/voices");
        if (res.ok) {
          const data = await res.json();
          setVoices(data.voices || []);
        }
      } catch (err) {
        console.error("Failed to fetch voices:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        if (activeAudio === audioRef.current) {
          setGlobalAudio(null, null);
        }
      }
    };
  }, []);

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoice = e.target.value;
    setSelectedVoice(newVoice);

    // Stop any currently playing audio if we switch voices
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (activeAudio === audioRef.current) {
        setGlobalAudio(null, null);
      }
    }
  };

  const handleSaveVoice = () => {
    localStorage.setItem("preferred-tts-voice", selectedVoice);
    setSavedVoice(selectedVoice);
  };

  const playSample = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (activeAudio === audioRef.current) {
        setGlobalAudio(null, null);
      }
      return;
    }

    // Stop any playing audio from Diary page
    if (activeAudio && activeSetIsPlaying && activeAudio !== audioRef.current) {
      activeAudio.pause();
      activeSetIsPlaying(false);
    }

    setIsAudioLoading(true);

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const text = "Hey there, I'm Misti. I hope you like my voice!";
      const params = new URLSearchParams();
      params.append("text", text);
      params.append("voice", selectedVoice);

      audioRef.current.src = `/api/tts?${params.toString()}`;

      audioRef.current.onended = () => {
        setIsPlaying(false);
        if (activeAudio === audioRef.current) {
          setGlobalAudio(null, null);
        }
        if (audioRef.current) audioRef.current.src = "";
      };

      await audioRef.current.play();
      setIsPlaying(true);
      setGlobalAudio(audioRef.current, setIsPlaying);
    } catch (err) {
      console.error("Failed to play sample audio:", err);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const hasUnsavedChanges = selectedVoice !== savedVoice;

  return (
    <div className="animate-fade-in">
      <AppHeader title="Settings" icon={<Settings size={32} />} />

      <div className="card">
        <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>
          Read Aloud Settings
        </h2>

        {loading ? (
          <div style={{ color: "var(--text-muted)" }}>
            Loading available voices...
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div>
              <label
                htmlFor="voice-select"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                TTS Voice
              </label>
              <div className="select-wrapper" style={{ width: "100%" }}>
                <select
                  id="voice-select"
                  className="select-pretty"
                  value={selectedVoice}
                  onChange={handleVoiceChange}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    textAlignLast: "left",
                  }}
                >
                  {voices.map((voice) => (
                    <option key={voice.ShortName} value={voice.ShortName}>
                      {voice.FriendlyName || voice.ShortName} ({voice.Locale} -{" "}
                      {voice.Gender})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <button
                  onClick={playSample}
                  disabled={isAudioLoading}
                  className={`btn-icon ${isAudioLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  aria-label={isPlaying ? "Stop Sample" : "Play Sample"}
                  title={isPlaying ? "Stop Sample" : "Play Sample"}
                >
                  {isAudioLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : isPlaying ? (
                    <Square size={20} fill="currentColor" />
                  ) : (
                    <Play
                      size={20}
                      fill="currentColor"
                      style={{ marginLeft: "2px" }}
                    />
                  )}
                </button>
                <span
                  style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}
                >
                  {isPlaying ? "Playing sample..." : "Test voice"}
                </span>
              </div>

              <button
                onClick={handleSaveVoice}
                disabled={!hasUnsavedChanges}
                style={{
                  background: hasUnsavedChanges
                    ? "var(--accent-color)"
                    : "transparent",
                  color: hasUnsavedChanges ? "white" : "var(--text-muted)",
                  border: hasUnsavedChanges
                    ? "none"
                    : "1px solid var(--border-subtle)",
                  padding: "8px 16px",
                  borderRadius: "var(--border-radius-sm)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  transition: "var(--transition-smooth)",
                  opacity: hasUnsavedChanges ? 1 : 0.6,
                  cursor: hasUnsavedChanges ? "pointer" : "default",
                }}
              >
                {hasUnsavedChanges ? "Save Selection" : "Saved"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
