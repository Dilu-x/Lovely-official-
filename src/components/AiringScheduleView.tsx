import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Star, Loader2, Play } from 'lucide-react';
import { AnimeMedia } from '../types';

interface AiringScheduleViewProps {
  onSelectAnime: (id: number) => void;
}

export const AiringScheduleView: React.FC<AiringScheduleViewProps> = ({ onSelectAnime }) => {
  const [scheduleList, setScheduleList] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/schedule?per_page=24')
      .then((res) => res.json())
      .then((data) => {
        setScheduleList(data.results || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatAiringTime = (unixSeconds?: number) => {
    if (!unixSeconds) return 'Airing soon';
    const date = new Date(unixSeconds * 1000);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCountdown = (secondsUntil?: number) => {
    if (!secondsUntil) return '';
    const hours = Math.floor(secondsUntil / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `In ${days}d ${hours % 24}h`;
    return `In ${hours}h`;
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-xs font-semibold">Loading airing schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-400" />
            Airing Release Schedule
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upcoming anime episodes airing this week
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scheduleList.map((item, idx) => {
          const title = item.title?.english || item.title?.romaji || 'Anime';
          const cover = item.coverImage?.large || item.coverImage?.extraLarge;

          return (
            <div
              key={item.id + idx}
              onClick={() => onSelectAnime(item.id)}
              className="flex items-center gap-4 bg-[#0c0f1d] border border-white/10 hover:border-pink-500/40 p-3.5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 group"
            >
              <img
                src={cover}
                alt={title}
                className="w-16 h-22 object-cover rounded-xl bg-slate-800 flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Ep {item.next_episode || '1'}
                </span>

                <h3 className="text-xs font-bold text-slate-100 truncate group-hover:text-pink-400 transition-colors">
                  {title}
                </h3>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-sky-400" />
                  <span className="truncate">{formatAiringTime(item.airingAt)}</span>
                </div>

                {item.timeUntilAiring && (
                  <div className="text-[10px] font-semibold text-emerald-400">
                    {formatCountdown(item.timeUntilAiring)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
