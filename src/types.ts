export interface Title {
  romaji?: string;
  english?: string;
  native?: string;
}

export interface CoverImage {
  large?: string;
  extraLarge?: string;
  color?: string;
}

export interface Studio {
  id?: number;
  name: string;
  isAnimationStudio?: boolean;
}

export interface AiringEpisode {
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
}

export interface AnimeMedia {
  id: number;
  idMal?: number;
  title: Title;
  description?: string;
  coverImage?: CoverImage;
  bannerImage?: string;
  format?: string;
  season?: string;
  seasonYear?: number;
  episodes?: number;
  duration?: number;
  status?: string;
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  favourites?: number;
  trending?: number;
  genres?: string[];
  tags?: { name: string; rank?: number; isMediaSpoiler?: boolean }[];
  source?: string;
  countryOfOrigin?: string;
  isAdult?: boolean;
  siteUrl?: string;
  trailer?: { id?: string; site?: string; thumbnail?: string };
  studios?: { nodes: Studio[] };
  nextAiringEpisode?: AiringEpisode;
  next_episode?: number;
  airingAt?: number;
  timeUntilAiring?: number;
  startDate?: { year?: number; month?: number; day?: number };
  endDate?: { year?: number; month?: number; day?: number };
  characters?: {
    edges: Array<{
      role: string;
      node: {
        id: number;
        name: { full: string; native?: string };
        image?: { large?: string };
      };
      voiceActors?: Array<{
        id: number;
        name: { full: string; native?: string };
        image?: { large?: string };
        languageV2?: string;
      }>;
    }>;
  };
  relations?: {
    edges: Array<{
      relationType: string;
      node: {
        id: number;
        title: Title;
        coverImage?: CoverImage;
        format?: string;
        type?: string;
        status?: string;
        episodes?: number;
        meanScore?: number;
      };
    }>;
  };
  recommendations?: {
    nodes: Array<{
      rating: number;
      mediaRecommendation: AnimeMedia;
    }>;
  };
}

export interface EpisodeItem {
  id: string; // e.g., watch/kiwi/178005/sub/animepahe-1
  number: number;
  title?: string;
  image?: string;
  airDate?: string;
  duration?: number;
  filler?: boolean;
}

export interface EpisodeProviderData {
  episodes: Record<string, EpisodeItem[]> | EpisodeItem[];
}

export interface EpisodesResponse {
  mappings?: Record<string, any>;
  providers?: Record<string, EpisodeProviderData>;
  error?: { status: number; detail: string };
}

export interface StreamSource {
  url: string;
  type?: string;
  quality?: string;
  resolution?: string;
  codec?: string;
  fansub?: string;
}

export interface SubtitleTrack {
  file: string;
  label: string;
  kind?: string;
}

export interface WatchSourcesResponse {
  streams?: StreamSource[];
  subtitles?: SubtitleTrack[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

export interface DownloadOption {
  url: string;
  quality?: string;
  resolution?: string;
  codec?: string;
  fansub?: string;
}

export interface DownloadResponse {
  anilist_id: number;
  provider: string;
  episode: string;
  download_url: string | null;
  downloads: DownloadOption[];
  note?: string;
}

export interface SuggestionItem {
  id: number;
  title: string;
  title_romaji?: string;
  poster?: string;
  format?: string;
  status?: string;
  year?: number;
  episodes?: number;
}

export type ActiveTabMode = 'anime' | 'api-docs';
