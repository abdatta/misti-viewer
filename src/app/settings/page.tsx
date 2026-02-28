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

  // Auto-play toggle
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(false);
  const [savedAutoPlay, setSavedAutoPlay] = useState<boolean>(false);

  useEffect(() => {
    // Load saved configurations
    const storedVoice = localStorage.getItem("preferred-tts-voice");
    if (storedVoice) {
      setSelectedVoice(storedVoice);
      setSavedVoice(storedVoice);
    }
    const autoPlayStatus = localStorage.getItem("tts-auto-play") === "true";
    setAutoPlayEnabled(autoPlayStatus);
    setSavedAutoPlay(autoPlayStatus);

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

    // Auto-play sample immediately when a new voice is selected
    playSample(newVoice);
  };

  const handleSaveSettings = () => {
    localStorage.setItem("preferred-tts-voice", selectedVoice);
    localStorage.setItem("tts-auto-play", String(autoPlayEnabled));
    setSavedVoice(selectedVoice);
    setSavedAutoPlay(autoPlayEnabled);
  };

  const playSample = async (overrideVoice?: string) => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (activeAudio === audioRef.current) {
        setGlobalAudio(null, null);
      }

      // If we're clicking another voice while playing, don't just stop—restart with the new voice.
      if (!overrideVoice) return;
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
      params.append("voice", overrideVoice || selectedVoice);

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

  const hasUnsavedChanges =
    selectedVoice !== savedVoice || autoPlayEnabled !== savedAutoPlay;

  return (
    <div className="animate-fade-in">
      <AppHeader title="Settings" icon={<Settings size={32} />} />

      <div className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Read Aloud Settings</h2>

          <button
            onClick={handleSaveSettings}
            disabled={!hasUnsavedChanges}
            style={{
              background: hasUnsavedChanges
                ? "var(--accent-color)"
                : "transparent",
              color: hasUnsavedChanges ? "white" : "var(--text-muted)",
              border: hasUnsavedChanges
                ? "none"
                : "1px solid var(--border-subtle)",
              padding: "6px 16px",
              borderRadius: "var(--border-radius-sm)",
              fontWeight: 600,
              fontSize: "0.85rem",
              transition: "var(--transition-smooth)",
              opacity: hasUnsavedChanges ? 1 : 0.6,
              cursor: hasUnsavedChanges ? "pointer" : "default",
            }}
          >
            {hasUnsavedChanges ? "Save" : "Saved"}
          </button>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)" }}>
            Loading available voices...
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div>
              <label
                htmlFor="voice-select"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                <span>TTS Voice</span>
                {isAudioLoading && (
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    <Loader2 size={12} className="animate-spin" /> Playing
                    Sample...
                  </span>
                )}
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
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                  Auto-play next entry
                </span>
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "44px",
                    height: "24px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={autoPlayEnabled}
                    onChange={(e) => setAutoPlayEnabled(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: autoPlayEnabled
                        ? "var(--accent-color)"
                        : "var(--border-subtle)",
                      transition: ".2s",
                      borderRadius: "24px",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        content: '""',
                        height: "18px",
                        width: "18px",
                        left: autoPlayEnabled ? "22px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        transition: ".2s",
                        borderRadius: "50%",
                      }}
                    />
                  </span>
                </label>
              </div>
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                }}
              >
                Automatically play the next chronological entry when the current
                one finishes.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
