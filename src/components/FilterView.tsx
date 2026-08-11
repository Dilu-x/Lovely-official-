import React, { useState, useEffect } from 'react';
import { Filter, X, Search, Sparkles, Loader2, Star } from 'lucide-react';
import { AnimeMedia } from '../types';
import { AnimeCard } from './AnimeCard';

interface FilterViewProps {
  onClose: () => void;
  onSelectAnime: (id: number) => void;
}

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror',
  'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance',
  'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];

const FORMATS = ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'];
const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const STATUSES = ['RELEASING', 'FINISHED', 'NOT_YET_RELEASED', 'CANCELLED'];
const SORTS = [
  { label: 'Most Popular', value: 'POPULARITY_DESC' },
  { label: 'Highest Rated', value: 'SCORE_DESC' },
  { label: 'Trending Now', value: 'TRENDING_DESC' },
  { label: 'Newest Aired', value: 'START_DATE_DESC' },
  { label: 'Most Favorited', value: 'FAVOURITES_DESC' },
];

export const FilterView: React.FC<FilterViewProps> = ({ onClose, onSelectAnime }) => {
  const [genre, setGenre] = useState<string>('');
  const [format, setFormat] = useState<string>('');
  const [season, setSeason] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sort, setSort] = useState<string>('POPULARITY_DESC');

  const [results, setResults] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFilteredAnime = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (genre) params.append('genre', genre);
    if (format) params.append('format', format);
    if (season) params.append('season', season);
    if (year) params.append('year', year);
    if (status) params.append('status', status);
    if (sort) params.append('sort', sort);
    params.append('per_page', '24');

    fetch(`/api/filter?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFilteredAnime();
  }, [genre, format, season, year, status, sort]);

  const resetFilters = () => {
    setGenre('');
    setFormat('');
    setSeason('');
    setYear('');
    setStatus('');
    setSort('POPULARITY_DESC');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-6xl bg-[#080b18] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Filter & Browse Anime</h2>
              <p className="text-xs text-slate-400">Combine genres, formats, release seasons and scores</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetFilters}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition-all"
            >
              Reset All
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="py-6 border-b border-white/10 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Genre */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500/50"
              >
                <option value="" className="bg-slate-900">All Genres</option>
                {GENRES.map((g) => (
                  <option key={g} value={g} className="bg-slate-900">{g}</option>
                ))}
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500/50"
              >
                <option value="" className="bg-slate-900">All Formats</option>
                {FORMATS.map((f) => (
                  <option key={f} value={f} className="bg-slate-900">{f}</option>
                ))}
              </select>
            </div>

            {/* Season */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Season</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500/50"
              >
                <option value="" className="bg-slate-900">All Seasons</option>
                {SEASONS.map((s) => (
                  <option key={s} value={s} className="bg-slate-900">{s}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Year</label>
              <input
                type="number"
                placeholder="e.g. 2025"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500/50"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500/50"
              >
                <option value="" className="bg-slate-900">All Statuses</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st} className="bg-slate-900">{st}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sort By</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500/50"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-slate-900">{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filtered Results Grid */}
        <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
              <p className="text-xs font-semibold">Filtering anime database...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              No anime matched your current filter criteria. Try resetting filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {results.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} onSelect={onSelectAnime} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
