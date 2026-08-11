import React, { useState, useEffect } from 'react';
import { Play, Info, Star, Calendar, Tv, Sparkles, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { AnimeMedia } from '../types';

interface AnimeHeroProps {
  spotlightList: AnimeMedia[];
  onSelectAnime: (id: number) => void;
  onWatchAnime: (id: number, episodeNum?: number) => void;
  onOpenTrailer?: (trailerId: string) => void;
}

export const AnimeHero: React.FC<AnimeHeroProps> = ({
  spotlightList,
  onSelectAnime,
  onWatchAnime,
  onOpenTrailer,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (spotlightList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % spotlightList.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [spotlightList.length]);

  if (!spotlightList || spotlightList.length === 0) {
    return null;
  }

  const current = spotlightList[currentIndex];
  const title = current.title?.english || current.title?.romaji || 'Anime';
  const score = current.averageScore ? (current.averageScore / 10).toFixed(1) : 'N/A';
  const backdrop = current.bannerImage || current.coverImage?.extraLarge || current.coverImage?.large;

  return (
    <div className="relative w-full h-[480px] sm:h-[540px] rounded-3xl overflow-hidden border border-white/10 my-6 bg-[#0a0d18] shadow-2xl group">
      {/* Background Banner with Gradient Overlay */}
      <div className="absolute inset-0">
        <img
          src={backdrop}
          alt={title}
          className="w-full h-full object-cover object-center filter brightness-[0.45] transition-transform duration-1000 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060810] via-[#060810]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060810] via-[#060810]/80 to-transparent w-full md:w-3/4" />
      </div>

      {/* Foreground Content */}
      <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-12 flex flex-col justify-end pb-12 z-10">
        <div className="max-w-2xl space-y-4">
          {/* Tag Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              # {currentIndex + 1} Spotlight
            </span>
            {current.format && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 text-slate-200">
                <Tv className="w-3.5 h-3.5 text-pink-400" />
                {current.format}
              </span>
            )}
            {current.seasonYear && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                {current.seasonYear}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              {score}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white line-clamp-2 drop-shadow-md">
            {title}
          </h1>

          {/* Genre Chips */}
          {current.genres && current.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {current.genres.slice(0, 4).map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-slate-300 hover:bg-white/20 transition-colors"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {current.description && (
            <p
              className="text-xs sm:text-sm text-slate-300/90 line-clamp-2 sm:line-clamp-3 leading-relaxed font-normal pt-1"
              dangerouslySetInnerHTML={{ __html: current.description }}
            />
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => onWatchAnime(current.id, 1)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-bold text-sm shadow-xl shadow-pink-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Watch Now</span>
            </button>

            <button
              onClick={() => onSelectAnime(current.id)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-sm transition-all"
            >
              <Info className="w-4 h-4 text-sky-400" />
              <span>Details & Episodes</span>
            </button>

            {current.trailer?.id && onOpenTrailer && (
              <button
                onClick={() => onOpenTrailer(current.trailer!.id!)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 font-medium text-xs transition-all"
              >
                <Video className="w-4 h-4 text-amber-400" />
                <span>Trailer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + spotlightList.length) % spotlightList.length)}
          className="p-2.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 text-white backdrop-blur-md transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/15 text-xs text-slate-300 backdrop-blur-md font-mono">
          <span>{currentIndex + 1}</span>
          <span className="text-slate-500">/</span>
          <span>{spotlightList.length}</span>
        </div>

        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % spotlightList.length)}
          className="p-2.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 text-white backdrop-blur-md transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
