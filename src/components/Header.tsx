import React, { useState, useEffect, useRef } from 'react';
import { Search, Film, Code, Sparkles, Filter, X, Play, Loader2 } from 'lucide-react';
import { ActiveTabMode, SuggestionItem } from '../types';

interface HeaderProps {
  activeTab: ActiveTabMode;
  setActiveTab: (tab: ActiveTabMode) => void;
  onSelectAnime: (id: number) => void;
  onOpenFilter: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onSelectAnime,
  onOpenFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/suggestions?query=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSuggestion = (id: number) => {
    setShowDropdown(false);
    setSearchQuery('');
    onSelectAnime(id);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#060810]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Main Tabs */}
        <div className="flex items-center justify-between w-full md:w-auto gap-6">
          <div 
            onClick={() => setActiveTab('anime')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 p-[1px] shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#090b14] rounded-[11px] flex items-center justify-center">
                <Film className="w-5 h-5 text-pink-400 group-hover:text-pink-300" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-pink-300 bg-clip-text text-transparent">
                Lovely<span className="text-pink-500">Anime</span>
              </span>
              <span className="block text-[10px] uppercase font-semibold tracking-widest text-pink-400/80 -mt-0.5">
                Stream & API v3.0
              </span>
            </div>
          </div>

          {/* Navigation Toggle Buttons */}
          <nav className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('anime')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'anime'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Watch Anime</span>
            </button>
            <button
              onClick={() => setActiveTab('api-docs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'api-docs'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>API Tester & Docs</span>
            </button>
          </nav>
        </div>

        {/* Search Bar & Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80" ref={dropdownRef}>
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search anime (e.g. Naruto, One Piece)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                className="w-full bg-white/[0.06] border border-white/10 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-10 py-2 text-xs transition-all outline-none"
              />
              {loadingSuggestions ? (
                <Loader2 className="absolute right-3 w-4 h-4 text-pink-400 animate-spin" />
              ) : searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Instant Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c0f1d] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5">
                <div className="p-2 text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-white/[0.02]">
                  Autocomplete Suggestions
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {suggestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSuggestion(item.id)}
                      className="flex items-center gap-3 p-2.5 hover:bg-white/10 cursor-pointer transition-colors group"
                    >
                      <img
                        src={item.poster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&q=80'}
                        alt={item.title}
                        className="w-10 h-14 object-cover rounded-md flex-shrink-0 bg-slate-800"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-100 truncate group-hover:text-pink-400 transition-colors">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          {item.format && <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{item.format}</span>}
                          {item.year && <span>{item.year}</span>}
                          {item.episodes && <span>{item.episodes} eps</span>}
                        </div>
                      </div>
                      <Play className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenFilter}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-all flex-shrink-0"
            title="Filter Anime"
          >
            <Filter className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>
    </header>
  );
};
