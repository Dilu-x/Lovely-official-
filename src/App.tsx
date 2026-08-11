import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AnimeHero } from './components/AnimeHero';
import { AnimeCard } from './components/AnimeCard';
import { AnimeDetailModal } from './components/AnimeDetailModal';
import { AnimePlayerModal } from './components/AnimePlayerModal';
import { DownloadModal } from './components/DownloadModal';
import { AiringScheduleView } from './components/AiringScheduleView';
import { FilterView } from './components/FilterView';
import { ApiPortalView } from './components/ApiPortalView';
import { ActiveTabMode, AnimeMedia } from './types';
import { Flame, TrendingUp, Sparkles, Tv, Calendar, Loader2, X } from 'lucide-react';

export default function App() {
  const [activeTabMode, setActiveTabMode] = useState<ActiveTabMode>('anime');
  const [animeCategory, setAnimeCategory] = useState<'trending' | 'popular' | 'upcoming' | 'recent' | 'schedule'>('trending');

  // Spotlight and Collections
  const [spotlightList, setSpotlightList] = useState<AnimeMedia[]>([]);
  const [collectionList, setCollectionList] = useState<AnimeMedia[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(true);

  // Modals state
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [trailerId, setTrailerId] = useState<string | null>(null);

  const [playerState, setPlayerState] = useState<{
    anilistId: number;
    provider: string;
    category: string;
    slug: string;
    epNum: number;
  } | null>(null);

  const [downloadModalState, setDownloadModalState] = useState<{
    anilistId: number;
    provider: string;
    category: string;
    epNum: number;
  } | null>(null);

  // Fetch Spotlight
  useEffect(() => {
    fetch('/api/spotlight')
      .then((res) => res.json())
      .then((data) => setSpotlightList(data.results || []))
      .catch((err) => console.error('Failed to load spotlight:', err));
  }, []);

  // Fetch Collection when tab changes
  useEffect(() => {
    if (animeCategory === 'schedule') return;
    setLoadingCollection(true);
    fetch(`/api/${animeCategory}?per_page=24`)
      .then((res) => res.json())
      .then((data) => setCollectionList(data.results || []))
      .catch((err) => console.error('Failed to load collection:', err))
      .finally(() => setLoadingCollection(false));
  }, [animeCategory]);

  // Handlers
  const handleWatchEpisode = (
    anilistId: number,
    provider: string,
    category: string,
    slug: string,
    epNum: number
  ) => {
    setPlayerState({ anilistId, provider, category, slug, epNum });
  };

  const handleOpenDownload = (
    anilistId: number,
    provider: string,
    category: string,
    epNum: number
  ) => {
    setDownloadModalState({ anilistId, provider, category, epNum });
  };

  const handleQuickWatch = (anilistId: number) => {
    // Default quick watch episode 1
    handleWatchEpisode(anilistId, 'kiwi', 'sub', 'animepahe-1', 1);
  };

  return (
    <div className="min-h-screen bg-[#04060e] text-slate-100 font-sans selection:bg-pink-500 selection:text-white flex flex-col">
      {/* Header Bar */}
      <Header
        activeTab={activeTabMode}
        setActiveTab={setActiveTabMode}
        onSelectAnime={(id) => setSelectedAnimeId(id)}
        onOpenFilter={() => setIsFilterOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pb-16">
        {activeTabMode === 'api-docs' ? (
          <ApiPortalView />
        ) : (
          <div className="space-y-10">
            {/* Hero Spotlight */}
            {spotlightList.length > 0 && (
              <AnimeHero
                spotlightList={spotlightList}
                onSelectAnime={(id) => setSelectedAnimeId(id)}
                onWatchAnime={handleQuickWatch}
                onOpenTrailer={(id) => setTrailerId(id)}
              />
            )}

            {/* Collection Category Navigation Tabs */}
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 overflow-x-auto">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAnimeCategory('trending')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    animeCategory === 'trending'
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>Trending</span>
                </button>

                <button
                  onClick={() => setAnimeCategory('popular')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    animeCategory === 'popular'
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Popular</span>
                </button>

                <button
                  onClick={() => setAnimeCategory('recent')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    animeCategory === 'recent'
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  <Tv className="w-4 h-4" />
                  <span>Recent Airing</span>
                </button>

                <button
                  onClick={() => setAnimeCategory('upcoming')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    animeCategory === 'upcoming'
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upcoming</span>
                </button>

                <button
                  onClick={() => setAnimeCategory('schedule')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    animeCategory === 'schedule'
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Airing Schedule</span>
                </button>
              </div>
            </div>

            {/* Collection Grid or Airing Schedule View */}
            {animeCategory === 'schedule' ? (
              <AiringScheduleView onSelectAnime={(id) => setSelectedAnimeId(id)} />
            ) : loadingCollection ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                <p className="text-xs font-semibold">Loading anime catalog...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                {collectionList.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    onSelect={(id) => setSelectedAnimeId(id)}
                    onWatch={handleQuickWatch}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#02030a] py-8 text-center text-xs text-slate-500 space-y-2">
        <p>Lovely Anime Stream & API Endpoint Service v3.0</p>
        <p className="text-[11px] text-slate-600">Built with React, Express, Node.js, and AniList + Miruro Pipe</p>
      </footer>

      {/* Modals */}
      {selectedAnimeId && (
        <AnimeDetailModal
          anilistId={selectedAnimeId}
          onClose={() => setSelectedAnimeId(null)}
          onWatchEpisode={(id, prov, cat, slug, epNum) => {
            setSelectedAnimeId(null);
            handleWatchEpisode(id, prov, cat, slug, epNum);
          }}
          onOpenDownloadModal={(id, prov, cat, epNum) => {
            handleOpenDownload(id, prov, cat, epNum);
          }}
          onSelectRelated={(id) => setSelectedAnimeId(id)}
        />
      )}

      {playerState && (
        <AnimePlayerModal
          anilistId={playerState.anilistId}
          provider={playerState.provider}
          category={playerState.category}
          slug={playerState.slug}
          epNum={playerState.epNum}
          onClose={() => setPlayerState(null)}
          onSelectNextEp={(nextEp) => {
            setPlayerState({
              ...playerState,
              epNum: nextEp,
              slug: `animepahe-${nextEp}`,
            });
          }}
          onOpenDownloadModal={(id, prov, cat, epNum) => {
            handleOpenDownload(id, prov, cat, epNum);
          }}
        />
      )}

      {downloadModalState && (
        <DownloadModal
          anilistId={downloadModalState.anilistId}
          provider={downloadModalState.provider}
          category={downloadModalState.category}
          epNum={downloadModalState.epNum}
          onClose={() => setDownloadModalState(null)}
        />
      )}

      {isFilterOpen && (
        <FilterView
          onClose={() => setIsFilterOpen(false)}
          onSelectAnime={(id) => {
            setIsFilterOpen(false);
            setSelectedAnimeId(id);
          }}
        />
      )}

      {/* YouTube Trailer Lightbox */}
      {trailerId && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
            <button
              onClick={() => setTrailerId(null)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/70 text-white hover:bg-black transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${trailerId}?autoplay=1`}
              title="Anime Trailer"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
