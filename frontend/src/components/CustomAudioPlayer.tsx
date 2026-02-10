import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, RotateCw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomAudioPlayerProps {
  src: string;
  className?: string;
}

const SEEK_SECONDS = 10;

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function CustomAudioPlayer({ src, className }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setCurrentTime(audio.currentTime);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };

    onLoadedMetadata();
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const canSeek = duration > 0;
  const playbackProgress = useMemo(() => {
    if (!canSeek) return 0;
    return Math.min(Math.max(currentTime, 0), duration);
  }, [canSeek, currentTime, duration]);

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
    } catch {
      // Ignore autoplay/browser policy errors.
    }
  };

  const pause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const seekTo = (timeInSeconds: number) => {
    const audio = audioRef.current;
    if (!audio || !canSeek) return;

    const nextTime = Math.min(Math.max(timeInSeconds, 0), duration);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const seekBy = (deltaInSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    seekTo(audio.currentTime + deltaInSeconds);
  };

  return (
    <div
      className={cn(
        "rounded-md border border-border/70 bg-card/70 p-3",
        className,
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {isPlaying ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={pause}
              disabled={!isPlaying}
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={stop}
              disabled={!isPlaying && currentTime === 0}
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => seekBy(-SEEK_SECONDS)}
              disabled={!canSeek}
            >
              <RotateCcw className="h-4 w-4" />
              -10s
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => seekBy(SEEK_SECONDS)}
              disabled={!canSeek}
            >
              <RotateCw className="h-4 w-4" />
              +10s
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => void play()} disabled={isPlaying}>
            <Play className="h-4 w-4" />
            Play
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="min-w-[3rem] text-xs font-medium text-muted-foreground">
          {formatTime(playbackProgress)}
        </span>
        <input
          type="range"
          min={0}
          max={canSeek ? duration : 0}
          step={0.1}
          value={playbackProgress}
          onChange={(event) => seekTo(Number(event.target.value))}
          className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
          disabled={!canSeek}
          aria-label="Seek audio"
        />
        <span className="min-w-[3rem] text-right text-xs font-medium text-muted-foreground">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
