import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, FastForward, Download, Settings, Loader2, Maximize, AlertCircle, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import Hls from 'hls.js';
import { WatchSourcesResponse } from '../types';

interface AnimePlayerModalProps {
  anilistId: number;
  provider: string;
  category: string;
  slug: string;
  epNum: number;
  onClose: () => void;
  onSelectNextEp?: (nextEpNum: number) => void;
  onOpenDownloadModal: (anilistId: number, provider: string, category: string, epNum: number) => void;
}

export const AnimePlayerModal: React.FC<AnimePlayerModalProps> = ({
  anilistId,
  provider,
  category,
  slug,
  epNum,
  onClose,
  onSelectNextEp,
  onOpenDownloadModal,
}) => {
  const [sources, setSources] = useState<WatchSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/watch/${provider}/${anilistId}/${category}/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.error) {
          setError(data.error.detail || data.error || 'Failed to fetch watch sources');
        } else {
          setSources(data);
          setActiveStreamIndex(0);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load video stream');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [anilistId, provider, category, slug]);

  const activeStream = sources?.streams?.[activeStreamIndex];
  const streamUrl = activeStream?.url;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    let hls: Hls | null = null;

    if (Hls.isSupported() && (streamUrl.includes('.m3u8') || activeStream?.type === 'hls')) {
      hls = new Hls({
        enableWorker: true,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data);
          setError('Stream error occurred. Try another server or quality option.');
        }
      });
    } else {
      video.src = streamUrl;
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [streamUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);
  };

  const handleSkipIntro = () => {
    const video = videoRef.current;
    if (!video || !sources?.intro?.end) return;
    video.currentTime = sources.intro.end;
  };

  const handleSkipOutro = () => {
    const video = videoRef.current;
    if (!video || !sources?.outro?.end) return;
    video.currentTime = sources.outro.end;
  };

  const handleToggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-lg flex items-center justify-center p-2 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#070914] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase">
              {provider} • {category.toUpperCase()}
            </span>
            <h2 className="text-sm sm:text-base font-bold truncate">
              Episode {epNum}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenDownloadModal(anilistId, provider, category, epNum)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-semibold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">MP4 Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Box */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center group overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
              <p className="text-xs font-semibold">Loading video stream from {provider}...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-rose-300">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                className="w-full h-full object-contain cursor-pointer"
                playsInline
                crossOrigin="anonymous"
              >
                {/* Subtitles tracks */}
                {sources?.subtitles?.map((sub, i) => (
                  <track
                    key={i}
                    kind="subtitles"
                    src={sub.file}
                    label={sub.label}
                    default={i === 0}
                  />
                ))}
              </video>

              {/* Floating Skip Intro / Skip Outro Buttons */}
              {sources?.intro && currentTime >= sources.intro.start && currentTime <= sources.intro.end && (
                <button
                  onClick={handleSkipIntro}
                  className="absolute bottom-16 right-6 z-30 px-4 py-2 rounded-xl bg-pink-600/90 hover:bg-pink-500 text-white font-bold text-xs shadow-xl backdrop-blur-md transition-all flex items-center gap-2 animate-bounce"
                >
                  <FastForward className="w-4 h-4" />
                  <span>Skip Intro ({formatTime(sources.intro.end - currentTime)})</span>
                </button>
              )}

              {sources?.outro && currentTime >= sources.outro.start && currentTime <= sources.outro.end && (
                <button
                  onClick={handleSkipOutro}
                  className="absolute bottom-16 right-6 z-30 px-4 py-2 rounded-xl bg-pink-600/90 hover:bg-pink-500 text-white font-bold text-xs shadow-xl backdrop-blur-md transition-all flex items-center gap-2"
                >
                  <FastForward className="w-4 h-4" />
                  <span>Skip Outro</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Video Control Details Footer */}
        {sources && sources.streams && sources.streams.length > 0 && (
          <div className="p-4 sm:p-6 bg-white/[0.02] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Server Stream Selector */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-semibold flex-shrink-0">Quality / Server:</span>
              {sources.streams.map((stream, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStreamIndex(idx)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                    activeStreamIndex === idx
                      ? 'bg-pink-500 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {stream.quality || stream.resolution || `Server ${idx + 1}`} ({stream.type?.toUpperCase()})
                </button>
              ))}
            </div>

            {/* Next Episode Button */}
            {onSelectNextEp && (
              <button
                onClick={() => onSelectNextEp(epNum + 1)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-pink-500/20 transition-all self-end sm:self-auto"
              >
                <span>Next Episode ({epNum + 1})</span>
                <FastForward className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
