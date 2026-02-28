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
  const [selectedVoiceLabel, setSelectedVoiceLabel] = useState<string>(
    "EmmaMultilingualNeural (en-US)",
  );
  const [savedVoice, setSavedVoice] = useState<string>(
    "en-US-EmmaMultilingualNeural",
  );

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-play toggle
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(false);
  const [savedAutoPlay, setSavedAutoPlay] = useState<boolean>(false);

  useEffect(() => {
    // Load saved configurations
    const storedVoice = localStorage.getItem("preferred-tts-voice");
    const storedLabel = localStorage.getItem("preferred-tts-voice-label");
    if (storedVoice) {
      setSelectedVoice(storedVoice);
      setSavedVoice(storedVoice);
      if (storedLabel) {
        setSelectedVoiceLabel(storedLabel);
      } else {
        setSelectedVoiceLabel(storedVoice);
      }
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
    setSavedVoice(selectedVoice);

    // Stop playback if playing or loading
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    setIsPlaying(false);
    setIsAudioLoading(false);
    if (activeAudio === audioRef.current) {
      setGlobalAudio(null, null);
    }

    // Save the friendly label for the initial loading state
    const selectedVoiceObj = voices.find((v) => v.ShortName === selectedVoice);
    if (selectedVoiceObj) {
      const label = `${
        selectedVoiceObj.FriendlyName || selectedVoiceObj.ShortName
      } (${selectedVoiceObj.Locale} - ${selectedVoiceObj.Gender})`;
      localStorage.setItem("preferred-tts-voice-label", label);
      setSelectedVoiceLabel(label);
    }
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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsAudioLoading(true);

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const text = "Hey there, I'm Misti. I hope you like my voice!";
      const params = new URLSearchParams();
      params.append("text", text);
      params.append("voice", overrideVoice || selectedVoice);

      // Pre-fetch the audio blob so we can abort it if needed during the load phase
      const response = await fetch(`/api/tts?${params.toString()}`, { signal });
      if (!response.ok) throw new Error("TTS request failed");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (signal.aborted) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      audioRef.current.src = objectUrl;

      audioRef.current.onended = () => {
        setIsPlaying(false);
        if (activeAudio === audioRef.current) {
          setGlobalAudio(null, null);
        }
        if (audioRef.current) audioRef.current.src = "";
        URL.revokeObjectURL(objectUrl); // Clean up the blob URL Memory
      };

      await audioRef.current.play();

      // If the component unmounted or save was clicked precisely in the tight window before await play() resolves
      if (signal.aborted) {
        audioRef.current.pause();
        return;
      }

      setIsPlaying(true);
      setGlobalAudio(audioRef.current, setIsPlaying);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Audio sample playback canceled");
      } else {
        console.error("Failed to play sample audio:", err);
      }
    } finally {
      setIsAudioLoading(false);
    }
  };

  const hasUnsavedVoice = selectedVoice !== savedVoice;

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
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {isAudioLoading ? (
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
                ) : loading ? (
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    <Loader2 size={12} className="animate-spin" /> Loading
                    list...
                  </span>
                ) : null}
                <button
                  onClick={handleSaveSettings}
                  disabled={!hasUnsavedVoice}
                  style={{
                    background: hasUnsavedVoice
                      ? "var(--accent-color)"
                      : "transparent",
                    color: hasUnsavedVoice ? "white" : "var(--text-muted)",
                    border: hasUnsavedVoice
                      ? "none"
                      : "1px solid var(--border-subtle)",
                    height: "28px",
                    padding: "0 12px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    transition: "var(--transition-smooth)",
                    opacity: hasUnsavedVoice ? 1 : 0.6,
                    cursor: hasUnsavedVoice ? "pointer" : "default",
                  }}
                >
                  {hasUnsavedVoice ? "Save" : "Saved"}
                </button>
              </div>
            </label>
            <div
              className="select-wrapper"
              style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
            >
              <select
                id="voice-select"
                className="select-inline"
                value={selectedVoice}
                onChange={handleVoiceChange}
                disabled={loading}
                style={{
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {voices.length === 0 && loading ? (
                  <option value={selectedVoice}>{selectedVoiceLabel}</option>
                ) : (
                  voices.map((voice) => (
                    <option key={voice.ShortName} value={voice.ShortName}>
                      {voice.FriendlyName || voice.ShortName} ({voice.Locale} -{" "}
                      {voice.Gender})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setAutoPlayEnabled(newValue);
                    setSavedAutoPlay(newValue);
                    localStorage.setItem("tts-auto-play", String(newValue));
                  }}
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
      </div>
    </div>
  );
}
