import React, { useState, useEffect } from 'react';
import { X, Play, Star, Calendar, Tv, Film, Download, Users, Layers, ExternalLink, Loader2, Video, ChevronRight } from 'lucide-react';
import { AnimeMedia, EpisodesResponse } from '../types';

interface AnimeDetailModalProps {
  anilistId: number | null;
  onClose: () => void;
  onWatchEpisode: (id: number, provider: string, category: string, slug: string, epNum: number) => void;
  onOpenDownloadModal: (anilistId: number, provider: string, category: string, epNum: number) => void;
  onSelectRelated: (id: number) => void;
}

export const AnimeDetailModal: React.FC<AnimeDetailModalProps> = ({
  anilistId,
  onClose,
  onWatchEpisode,
  onOpenDownloadModal,
  onSelectRelated,
}) => {
  const [info, setInfo] = useState<AnimeMedia | null>(null);
  const [episodesData, setEpisodesData] = useState<EpisodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<'sub' | 'dub'>('sub');
  const [selectedProvider, setSelectedProvider] = useState<string>('kiwi');
  const [activeTab, setActiveTab] = useState<'episodes' | 'characters' | 'relations' | 'recommendations'>('episodes');
  const [epFilter, setEpFilter] = useState('');

  useEffect(() => {
    if (!anilistId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/anime/${anilistId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.error) {
          setError(data.error.detail || 'Failed to load anime');
        } else {
          setInfo(data.info);
          setEpisodesData(data.episodes);
          // auto-select first provider
          if (data.episodes?.providers) {
            const keys = Object.keys(data.episodes.providers);
            if (keys.length > 0) setSelectedProvider(keys[0]);
          }
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Error loading anime');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [anilistId]);

  if (!anilistId) return null;

  const currentProviderData = episodesData?.providers?.[selectedProvider];
  let episodeList: any[] = [];
  if (currentProviderData?.episodes) {
    if (Array.isArray(currentProviderData.episodes)) {
      episodeList = currentProviderData.episodes;
    } else {
      episodeList = currentProviderData.episodes[selectedCategory] || [];
    }
  }

  const filteredEpisodes = episodeList.filter((ep) => {
    if (!epFilter.trim()) return true;
    return String(ep.number).includes(epFilter) || (ep.title && ep.title.toLowerCase().includes(epFilter.toLowerCase()));
  });

  const title = info?.title?.english || info?.title?.romaji || 'Anime Details';
  const score = info?.averageScore ? (info.averageScore / 10).toFixed(1) : 'N/A';
  const backdrop = info?.bannerImage || info?.coverImage?.extraLarge;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#090c18] border border-white/15 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-100 flex flex-col max-h-[90vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white backdrop-blur-md transition-all shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
            <p className="text-sm font-medium">Fetching Anime Info & Episodes...</p>
          </div>
        ) : error ? (
          <div className="py-24 p-8 text-center space-y-4">
            <div className="text-rose-400 font-bold text-lg">Failed to load anime</div>
            <p className="text-slate-400 text-sm max-w-md mx-auto">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        ) : info ? (
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {/* Header Banner */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-900">
              <img
                src={backdrop || info.coverImage?.extraLarge}
                alt={title}
                className="w-full h-full object-cover filter brightness-[0.5]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090c18] via-[#090c18]/60 to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-end gap-6 z-10">
                {/* Poster image */}
                <img
                  src={info.coverImage?.extraLarge || info.coverImage?.large}
                  alt={title}
                  className="w-32 sm:w-44 aspect-[3/4] object-cover rounded-2xl border-2 border-white/20 shadow-2xl flex-shrink-0 -mb-10 sm:-mb-14 hidden sm:block bg-slate-800"
                  referrerPolicy="no-referrer"
                />

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {info.format && (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-pink-500/20 text-pink-300 border border-pink-500/30">
                        {info.format}
                      </span>
                    )}
                    {info.status && (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        {info.status}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-300" />
                      {score}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                    {title}
                  </h1>
                  {info.title?.romaji && info.title?.romaji !== title && (
                    <p className="text-xs sm:text-sm text-slate-300 font-medium italic">
                      {info.title.romaji}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Main Info Section */}
            <div className="p-6 sm:p-8 pt-12 sm:pt-16 space-y-8">
              {/* Metadata Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Season / Year</span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">
                    {info.season ? `${info.season} ${info.seasonYear || ''}` : info.startDate?.year || 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Episodes</span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">
                    {info.episodes ? `${info.episodes} total` : 'Ongoing'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Studios</span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5 truncate">
                    {info.studios?.nodes?.map((s) => s.name).join(', ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Popularity</span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">
                    #{info.popularity?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Genre Chips */}
              {info.genres && info.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {info.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-medium border border-white/10"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              {info.description && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Synopsis</h3>
                  <div
                    className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2 bg-white/[0.02] p-4 rounded-2xl border border-white/5"
                    dangerouslySetInnerHTML={{ __html: info.description }}
                  />
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="border-b border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTab('episodes')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'episodes'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Film className="w-4 h-4" />
                  <span>Episodes ({episodeList.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('characters')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'characters'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Characters ({info.characters?.edges?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('relations')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'relations'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Relations ({info.relations?.edges?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: EPISODES */}
              {activeTab === 'episodes' && (
                <div className="space-y-6">
                  {/* Provider & Sub/Dub Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10">
                    {/* Providers picker */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                      <span className="text-xs font-semibold text-slate-400 flex-shrink-0">Provider:</span>
                      {episodesData?.providers && Object.keys(episodesData.providers).map((prov) => (
                        <button
                          key={prov}
                          onClick={() => setSelectedProvider(prov)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex-shrink-0 ${
                            selectedProvider === prov
                              ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                          }`}
                        >
                          {prov}
                        </button>
                      ))}
                    </div>

                    {/* Category Sub / Dub */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-xs font-semibold text-slate-400">Audio:</span>
                      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => setSelectedCategory('sub')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            selectedCategory === 'sub'
                              ? 'bg-pink-500 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          SUB
                        </button>
                        <button
                          onClick={() => setSelectedCategory('dub')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            selectedCategory === 'dub'
                              ? 'bg-pink-500 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          DUB
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Filter Episodes Search Input */}
                  {episodeList.length > 12 && (
                    <input
                      type="text"
                      placeholder="Filter episode number or title..."
                      value={epFilter}
                      onChange={(e) => setEpFilter(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500/50"
                    />
                  )}

                  {/* Episode Grid */}
                  {filteredEpisodes.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-white/[0.02] rounded-2xl border border-white/5">
                      No episodes found for provider <b>{selectedProvider}</b> ({selectedCategory.toUpperCase()}). Try switching provider or category above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1 custom-scrollbar">
                      {filteredEpisodes.map((ep) => {
                        const slug = ep.id.startsWith('watch/')
                          ? ep.id.split('/').pop()!
                          : `${ep.id.split(':')[0] || ep.id}-${ep.number}`;

                        return (
                          <div
                            key={ep.id + ep.number}
                            className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-pink-500/40 rounded-xl p-3 flex flex-col justify-between transition-all"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-black text-pink-400">
                                Episode {ep.number}
                              </span>
                              <button
                                onClick={() => onOpenDownloadModal(info.id, selectedProvider, selectedCategory, ep.number)}
                                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-400 transition-colors"
                                title="Get Direct MP4 Link"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-300 font-medium line-clamp-1 mb-3">
                              {ep.title || `Episode ${ep.number}`}
                            </p>

                            <button
                              onClick={() => onWatchEpisode(info.id, selectedProvider, selectedCategory, slug, ep.number)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white font-bold text-[11px] transition-all"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Play Stream</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: CHARACTERS */}
              {activeTab === 'characters' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(info.characters?.edges || []).map((edge, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-white/[0.03] border border-white/10 p-3 rounded-2xl"
                    >
                      <img
                        src={edge.node.image?.large || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                        alt={edge.node.name.full}
                        className="w-12 h-16 object-cover rounded-xl bg-slate-800 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">
                          {edge.node.name.full}
                        </div>
                        <div className="text-[10px] text-pink-400 font-semibold uppercase mt-0.5">
                          {edge.role}
                        </div>
                        {edge.voiceActors?.[0] && (
                          <div className="text-[11px] text-slate-400 truncate mt-1">
                            VA: {edge.voiceActors[0].name.full}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: RELATIONS */}
              {activeTab === 'relations' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(info.relations?.edges || []).map((rel, idx) => {
                    const relTitle = rel.node.title?.english || rel.node.title?.romaji;
                    return (
                      <div
                        key={idx}
                        onClick={() => onSelectRelated(rel.node.id)}
                        className="flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 p-3 rounded-2xl cursor-pointer transition-all group"
                      >
                        <img
                          src={rel.node.coverImage?.large}
                          alt={relTitle}
                          className="w-12 h-16 object-cover rounded-xl bg-slate-800 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-sky-400 uppercase">
                            {rel.relationType}
                          </span>
                          <div className="text-xs font-bold text-slate-100 truncate group-hover:text-pink-400 transition-colors">
                            {relTitle}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {rel.node.format} {rel.node.episodes ? `• ${rel.node.episodes} eps` : ''}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-pink-400 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
