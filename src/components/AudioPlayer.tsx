import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Shuffle, Volume2, VolumeX, Music, AlertTriangle } from "lucide-react";

interface AudioPlayerProps {
  musicLinksString?: string;
}

const DEFAULT_SONGS = [
  "https://files.catbox.moe/d4wd13.mp3",
  "https://files.catbox.moe/0f0422.mp3",
  "https://files.catbox.moe/qbk0y4.mp3",
  "https://files.catbox.moe/7bb3tt.mp3",
  "https://files.catbox.moe/3wkmf4.mp3",
  "https://files.catbox.moe/b3r7az.mp3",
  "https://files.catbox.moe/0n4i33.mp3",
  "https://files.catbox.moe/vb9jex.mp3"
];

interface MusicDetails {
  title: string;
  artist: string;
}

export default function AudioPlayer({ musicLinksString }: AudioPlayerProps) {
  const [songs, setSongs] = useState<string[]>(DEFAULT_SONGS);
  const [songDetails, setSongDetails] = useState<Record<string, MusicDetails>>({});
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load songs from the api/v1/music endpoint
  useEffect(() => {
    const fetchMusic = async () => {
      try {
        const response = await fetch("/api/v1/music?all=true");
        if (response.ok) {
          const list = await response.json();
          if (Array.isArray(list) && list.length > 0) {
            const urls = list.map((item: any) => item.url);
            const detailsMap: Record<string, MusicDetails> = {};
            list.forEach((item: any) => {
              if (item.url) {
                detailsMap[item.url] = {
                  title: item.title,
                  artist: item.artist,
                };
              }
            });
            setSongs(urls);
            setSongDetails(detailsMap);
            // Select a random index on init
            const randIndex = Math.floor(Math.random() * urls.length);
            setCurrentSongIndex(randIndex);
            return;
          }
        }
      } catch (err) {
        console.warn("Lỗi fetch nhạc từ /api/v1/music:", err);
      }

      // Fallback/Legacy if prop is provided
      if (musicLinksString && musicLinksString.trim() !== "") {
        const parsed = musicLinksString
          .split(",")
          .map((link) => link.trim())
          .filter((link) => link !== "");
        if (parsed.length > 0) {
          setSongs(parsed);
          const randIndex = Math.floor(Math.random() * parsed.length);
          setCurrentSongIndex(randIndex);
          return;
        }
      }

      // Ultimate fallback to default songs
      setSongs(DEFAULT_SONGS);
      const randIndex = Math.floor(Math.random() * DEFAULT_SONGS.length);
      setCurrentSongIndex(randIndex);
    };

    fetchMusic();
  }, [musicLinksString]);

  // Sync state on song change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = songs[currentSongIndex];
      audioRef.current.load();
      setAudioError(null);
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn("Audio playback interrupted/prevented by browser autoplay policy:", error);
            // We keep isPlaying = true but do not crash. We'll let first user interaction trigger it.
          });
        }
      }
    }
  }, [currentSongIndex, songs]);

  // Bypass browser autoplay prevention by playing on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioRef.current && isPlaying) {
        audioRef.current.play()
          .then(() => {
            setAudioError(null);
          })
          .catch((err) => {
            console.log("Could not auto-play on first interaction yet:", err);
          });
      }
      // Remove listeners after first interaction
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("touchstart", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [isPlaying, currentSongIndex]);

  // Handle Play / Pause toggle
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setAudioError(null);
          })
          .catch((error) => {
            console.error("Audio playback error:", error);
            setAudioError("Click 'PHÁT' lại hoặc bấm 'RANDOM' để đổi link");
            setIsPlaying(false);
          });
      }
    }
  };

  // Skip to a random song
  const playRandomSong = () => {
    if (songs.length <= 1) {
      // Just restart
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }

    let nextIndex = currentSongIndex;
    // Ensure we pick a different song if possible
    while (nextIndex === currentSongIndex) {
      nextIndex = Math.floor(Math.random() * songs.length);
    }
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    playRandomSong();
  };

  // Sync volume and mute state to the audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted, currentSongIndex]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) {
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Get name of song from URL
  const getSongName = (url: string) => {
    try {
      const decoded = decodeURIComponent(url);
      const filename = decoded.substring(decoded.lastIndexOf("/") + 1);
      if (filename.includes("?")) {
        return filename.split("?")[0];
      }
      return filename || "CYBER_TRACK_RANDOM.mp3";
    } catch {
      return "CYBER_TRACK_RANDOM.mp3";
    }
  };

  const handleAudioError = () => {
    console.error("Audio load/playback error");
    setAudioError("Không thể tải bài hát này. Đang tự động đổi bài...");
    
    // Auto skip after 2 seconds to prevent infinite immediate loops
    setTimeout(() => {
      playRandomSong();
    }, 2000);
  };

  const currentSongUrl = songs[currentSongIndex];
  const currentDetails = currentSongUrl ? songDetails[currentSongUrl] : undefined;
  const songTitle = currentDetails ? currentDetails.title : getSongName(currentSongUrl);
  const songArtist = currentDetails ? currentDetails.artist : null;

  return (
    <div className="bg-black/80 border border-cyan-500/30 p-4 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.15)] relative overflow-hidden backdrop-blur-md">
      {/* Absolute laser line indicator */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
      />

      <div className="space-y-3">
        {/* Track Title and Visualizer Animation */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[8px] text-cyan-400 font-bold uppercase tracking-widest block mb-0.5">
              // ĐANG PHÁT NGẪU NHIÊN
            </span>
            <div className="flex items-center space-x-1.5">
              <Music className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-spin" style={{ animationDuration: isPlaying ? '3s' : '0s' }} />
              <div className="min-w-0 flex-1">
                <h4 className="font-mono text-[11px] text-gray-200 font-extrabold truncate uppercase tracking-tight select-all">
                  {songTitle}
                </h4>
                {songArtist && (
                  <span className="font-mono text-[8px] text-gray-400 block truncate leading-tight mt-0.5">
                    {songArtist}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cyber animated graphic bar visualizer */}
          <div className="flex items-end gap-[3px] h-6 shrink-0 pt-1">
            {[1.2, 1.8, 1.0, 2.2, 1.4, 1.9, 0.8, 1.5].map((speed, i) => (
              <span
                key={i}
                className="w-[3px] bg-cyan-400 rounded-t"
                style={{
                  height: isPlaying ? "100%" : "20%",
                  transformOrigin: "bottom",
                  animation: isPlaying ? `cyberBar ${speed}s ease-in-out infinite alternate` : "none",
                }}
              />
            ))}
          </div>
        </div>

        {/* CSS Animation injection for Visualizer */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes cyberBar {
            0% { transform: scaleY(0.15); }
            100% { transform: scaleY(1); }
          }
        `}} />

        {/* Audio load errors */}
        {audioError && (
          <div className="flex items-center space-x-1.5 p-2 bg-pink-500/10 border border-pink-500/20 rounded text-pink-400 font-mono text-[9px] font-bold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{audioError}</span>
          </div>
        )}

        {/* Progress Timeline Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleProgressChange}
            className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
          />
          <div className="flex items-center justify-between text-gray-500 font-mono text-[9px] font-bold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons row */}
        <div className="flex items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center space-x-1.5">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className={`flex items-center justify-center w-7 h-7 rounded-full text-black hover:scale-105 active:scale-95 transition-all duration-150 ${
                isPlaying ? "bg-cyan-400" : "bg-white"
              }`}
              title={isPlaying ? "Tạm dừng" : "Phát nhạc"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
            </button>

            {/* Random skip */}
            <button
              onClick={playRandomSong}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-900 border border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/5 text-cyan-400 active:scale-95 transition-all duration-150"
              title="Đổi bài ngẫu nhiên"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-1.5 bg-gray-950/40 border border-gray-900 px-2 py-1 rounded">
            <button
              onClick={toggleMute}
              className="text-gray-400 hover:text-cyan-400 transition-colors duration-150"
              title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-14 sm:w-16 h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>


      </div>
    </div>
  );
}
