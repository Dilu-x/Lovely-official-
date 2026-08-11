import React from 'react';
import { Star, Play, Tv } from 'lucide-react';
import { AnimeMedia } from '../types';

interface AnimeCardProps {
  anime: AnimeMedia;
  onSelect: (id: number) => void;
  onWatch?: (id: number) => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onSelect, onWatch }) => {
  const title = anime.title?.english || anime.title?.romaji || 'Anime';
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const cover = anime.coverImage?.extraLarge || anime.coverImage?.large;

  return (
    <div
      onClick={() => onSelect(anime.id)}
      className="group relative flex flex-col bg-[#0c0f1d] border border-white/10 hover:border-pink-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-pink-500/10"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
        <img
          src={cover || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80'}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Hover Overlay with Quick Play */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onWatch) onWatch(anime.id);
              else onSelect(anime.id);
            }}
            className="w-12 h-12 rounded-full bg-pink-500 hover:bg-pink-400 text-white flex items-center justify-center shadow-lg shadow-pink-500/40 scale-90 group-hover:scale-100 transition-transform"
            title="Watch Now"
          >
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </button>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none z-10">
          {score ? (
            <span className="flex items-center gap-1 bg-black/75 backdrop-blur-md border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-sm">
              <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
              {score}
            </span>
          ) : <span />}

          {anime.format && (
            <span className="bg-black/75 backdrop-blur-md border border-white/10 text-slate-200 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider">
              {anime.format}
            </span>
          )}
        </div>

        {/* Next Airing Episode Badge */}
        {anime.nextAiringEpisode && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-pink-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md text-center shadow-md">
            Ep {anime.nextAiringEpisode.episode} airing soon
          </div>
        )}
      </div>

      {/* Card Info Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          <h3 className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-2 group-hover:text-pink-400 transition-colors">
            {title}
          </h3>
          {anime.title?.romaji && anime.title?.romaji !== title && (
            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
              {anime.title.romaji}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
          <span>{anime.seasonYear || anime.startDate?.year || 'TBA'}</span>
          <span>{anime.episodes ? `${anime.episodes} episodes` : anime.status || 'Anime'}</span>
        </div>
      </div>
    </div>
  );
};
