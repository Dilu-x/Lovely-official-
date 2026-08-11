import 'dotenv/config';
import express from 'express';
import path from 'path';
import zlib from 'zlib';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
  'Referer': 'https://www.miruro.tv/',
  'Origin': 'https://www.miruro.tv',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty',
  'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

const ANILIST_URL = 'https://graphql.anilist.co';
const MIRURO_PIPE_URL = 'https://www.miruro.tv/api/secure/pipe';

// Episodes/sources/downloads go through the Miruro pipe, which is behind
// Cloudflare and hard-blocks datacenter IPs (Vercel, Render, Cloud Run, etc.).
// That's why episodes were failing here. The "lovely-anime-api" (api.py)
// project uses curl_cffi browser-TLS impersonation and is meant to be hosted
// on a VPS with a clean/residential IP, so we delegate all episode/source/
// download work to it. Set ANIME_API_BASE_URL to wherever that service is
// running (e.g. https://your-vps-host:8000). If it's not set/unreachable we
// fall back to the old direct-Miruro logic below (which is what was broken).
const PY_API_BASE = (process.env.ANIME_API_BASE_URL || process.env.PY_API_BASE || '').replace(/\/+$/, '');

async function pyApiFetch(pathAndQuery: string): Promise<any> {
  if (!PY_API_BASE) {
    throw { status: 503, message: 'ANIME_API_BASE_URL is not configured' };
  }
  const response = await fetch(`${PY_API_BASE}${pathAndQuery}`);
  if (!response.ok) {
    let body = '';
    try {
      body = (await response.text()).substring(0, 500);
    } catch {
      // ignore
    }
    throw { status: response.status, message: `lovely-anime-api returned status ${response.status}`, body };
  }
  return response.json();
}

const MEDIA_LIST_FIELDS = `
    id
    title { romaji english native }
    coverImage { large extraLarge }
    bannerImage
    format
    season
    seasonYear
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    genres
    source
    countryOfOrigin
    isAdult
    studios(isMain: true) { nodes { name isAnimationStudio } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
`;

const MEDIA_FULL_FIELDS = `
    id
    idMal
    title { romaji english native }
    description(asHtml: false)
    coverImage { large extraLarge color }
    bannerImage
    format
    season
    seasonYear
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    trending
    genres
    tags { name rank isMediaSpoiler }
    source
    countryOfOrigin
    isAdult
    hashtag
    synonyms
    siteUrl
    trailer { id site thumbnail }
    studios { nodes { id name isAnimationStudio siteUrl } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
    characters(sort: [ROLE, RELEVANCE], perPage: 25) {
        edges {
            role
            node { id name { full native } image { large } }
            voiceActors(language: JAPANESE) { id name { full native } image { large } languageV2 }
        }
    }
    staff(sort: RELEVANCE, perPage: 25) {
        edges {
            role
            node { id name { full native } image { large } }
        }
    }
    relations {
        edges {
            relationType(version: 2)
            node {
                id
                title { romaji english native }
                coverImage { large }
                format
                type
                status
                episodes
                meanScore
            }
        }
    }
    recommendations(sort: RATING_DESC, perPage: 10) {
        nodes {
            rating
            mediaRecommendation {
                id
                title { romaji english native }
                coverImage { large }
                format
                episodes
                status
                meanScore
                averageScore
            }
        }
    }
    externalLinks { url site type }
    streamingEpisodes { title thumbnail url site }
    stats {
        scoreDistribution { score amount }
        statusDistribution { status amount }
    }
`;

function encodePipeRequest(payload: any): string {
  const jsonStr = JSON.stringify(payload);
  return Buffer.from(jsonStr, 'utf-8')
    .toString('base64url')
    .replace(/=/g, '');
}

function decodePipeResponse(encodedStr: string): any {
  try {
    let str = encodedStr.trim();
    while (str.length % 4 !== 0) {
      str += '=';
    }
    const base64Standard = str.replace(/-/g, '+').replace(/_/g, '/');
    const compressedBuffer = Buffer.from(base64Standard, 'base64');
    const decompressed = zlib.gunzipSync(compressedBuffer);
    return JSON.parse(decompressed.toString('utf-8'));
  } catch (err) {
    throw new Error('Failed to decode pipe response');
  }
}

function translateId(encodedId: string): string {
  try {
    let str = encodedId;
    while (str.length % 4 !== 0) str += '=';
    const base64Standard = str.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64Standard, 'base64').toString('utf-8');
    if (decoded.includes(':')) {
      return decoded;
    }
    return encodedId;
  } catch {
    return encodedId;
  }
}

function deepTranslate(obj: any): void {
  if (!obj) return;
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      for (const item of obj) deepTranslate(item);
    } else {
      for (const key of Object.keys(obj)) {
        if (key === 'id' && typeof obj[key] === 'string') {
          obj[key] = translateId(obj[key]);
        } else if (typeof obj[key] === 'object') {
          deepTranslate(obj[key]);
        }
      }
    }
  }
}

function injectSourceSlugs(data: any, anilistId: number): any {
  const providers = data.providers || {};
  for (const providerName of Object.keys(providers)) {
    const providerData = providers[providerName];
    if (typeof providerData !== 'object' || !providerData) continue;
    let episodes = providerData.episodes;
    if (typeof episodes !== 'object' || !episodes) continue;
    if (Array.isArray(episodes)) {
      providerData.episodes = { sub: episodes };
      episodes = providerData.episodes;
    }
    for (const category of Object.keys(episodes)) {
      const epList = episodes[category];
      if (!Array.isArray(epList)) continue;
      for (const ep of epList) {
        if (typeof ep !== 'object' || !ep) continue;
        if (ep.id !== undefined && ep.number !== undefined) {
          const origId = String(ep.id);
          const prefix = origId.includes(':') ? origId.split(':')[0] : origId;
          ep.id = `watch/${providerName}/${anilistId}/${category}/${prefix}-${ep.number}`;
        }
      }
    }
  }
  return data;
}

async function fetchRawEpisodes(anilistId: number): Promise<any> {
  const payload = {
    path: 'episodes',
    method: 'GET',
    query: { anilistId },
    body: null,
    version: '0.1.0',
  };
  const encodedReq = encodePipeRequest(payload);
  const response = await fetch(`${MIRURO_PIPE_URL}?e=${encodedReq}`, {
    headers: HEADERS,
  });

  if (!response.ok) {
    const text = await response.text();
    throw {
      status: response.status,
      message: `Miruro API returned status ${response.status}`,
      body: text.substring(0, 500),
    };
  }

  const rawText = await response.text();
  const data = decodePipeResponse(rawText.trim());
  deepTranslate(data);
  return data;
}

async function fetchSources(episodeId: string, provider: string, anilistId: number, category: string): Promise<any> {
  const encId = Buffer.from(episodeId, 'utf-8').toString('base64url').replace(/=/g, '');
  const payload = {
    path: 'sources',
    method: 'GET',
    query: {
      episodeId: encId,
      provider,
      category,
      anilistId,
    },
    body: null,
    version: '0.1.0',
  };
  const encodedReq = encodePipeRequest(payload);
  const response = await fetch(`${MIRURO_PIPE_URL}?e=${encodedReq}`, {
    headers: HEADERS,
  });

  if (!response.ok) {
    const text = await response.text();
    throw {
      status: response.status,
      message: `Miruro API returned status ${response.status}`,
      body: text.substring(0, 500),
    };
  }

  const rawText = await response.text();
  return decodePipeResponse(rawText.trim());
}

async function findEpisodeTarget(anilistId: number, provider: string, category: string, slug: string): Promise<string> {
  const data = await fetchRawEpisodes(anilistId);
  const provData = (data.providers && data.providers[provider]) || {};
  const epList = (provData.episodes && provData.episodes[category]) || [];

  for (const ep of epList) {
    const origId = String(ep.id || '');
    const prefix = origId.includes(':') ? origId.split(':')[0] : origId;
    if (`${prefix}-${ep.number}` === slug) {
      return origId;
    }
  }
  throw { status: 404, message: `Episode slug '${slug}' not found for provider ${provider}` };
}

// --- lovely-anime-api backed helpers (primary path, with fallback to the
// direct-Miruro functions above if the Python API isn't configured/reachable) ---

async function fetchEpisodesWithSlugs(anilistId: number): Promise<any> {
  if (PY_API_BASE) {
    try {
      return await pyApiFetch(`/episodes/${anilistId}`);
    } catch (e: any) {
      console.error(`[lovely-anime-api] episodes fetch failed for ${anilistId}, falling back to direct Miruro:`, e.message || e);
    }
  }
  const raw = await fetchRawEpisodes(anilistId);
  return injectSourceSlugs(raw, anilistId);
}

async function fetchSourcesForSlug(provider: string, anilistId: number, category: string, slug: string): Promise<any> {
  if (PY_API_BASE) {
    try {
      return await pyApiFetch(`/watch/${provider}/${anilistId}/${category}/${slug}`);
    } catch (e: any) {
      console.error(`[lovely-anime-api] watch fetch failed for ${anilistId}/${provider}/${slug}, falling back to direct Miruro:`, e.message || e);
    }
  }
  const targetId = await findEpisodeTarget(anilistId, provider, category, slug);
  return fetchSources(targetId, provider, anilistId, category);
}

async function fetchDownloadForSlug(provider: string, anilistId: number, category: string, slug: string): Promise<any> {
  if (PY_API_BASE) {
    try {
      return await pyApiFetch(`/download/${provider}/${anilistId}/${category}/${slug}`);
    } catch (e: any) {
      console.error(`[lovely-anime-api] download fetch failed for ${anilistId}/${provider}/${slug}, falling back to direct Miruro:`, e.message || e);
    }
  }
  if (provider === 'auto') {
    return autoDirectDownload(anilistId, category, slug);
  }
  const targetId = await findEpisodeTarget(anilistId, provider, category, slug);
  const data = await fetchSources(targetId, provider, anilistId, category);
  return buildDownloadResponse(data, anilistId, provider, targetId);
}

async function anilistQuery(query: string, variables?: any): Promise<any> {
  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw { status: 500, message: 'AniList GraphQL query failed' };
  }

  const json = await response.json();
  return json.data || {};
}

// Helper collection fetcher
async function fetchCollection(sortType: string, status?: string, page = 1, perPage = 20) {
  const statusFilter = status ? `, status: ${status}` : '';
  const gql = `
    query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage perPage }
            media(type: ANIME, sort: [${sortType}]${statusFilter}) {
                ${MEDIA_LIST_FIELDS}
            }
        }
    }
  `;
  const data = await anilistQuery(gql, { page, perPage });
  const pageData = data.Page || {};
  const pageInfo = pageData.pageInfo || {};
  return {
    page: pageInfo.currentPage || page,
    perPage: pageInfo.perPage || perPage,
    total: pageInfo.total || 0,
    hasNextPage: pageInfo.hasNextPage || false,
    results: pageData.media || [],
  };
}

// --- API ENDPOINT ROUTERS ---
const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const query = (req.query.query || req.query.q || '') as string;
    const page = parseInt((req.query.page as string) || '1', 10);
    const perPage = Math.min(50, Math.max(1, parseInt((req.query.per_page as string) || '20', 10)));

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "query" or "q" is required' });
    }

    const gql = `
      query ($search: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
              pageInfo { total currentPage lastPage hasNextPage perPage }
              media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                  ${MEDIA_LIST_FIELDS}
              }
          }
      }
    `;
    const data = await anilistQuery(gql, { search: query, page, perPage });
    const pageData = data.Page || {};
    const pageInfo = pageData.pageInfo || {};
    res.json({
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: pageInfo.hasNextPage || false,
      results: pageData.media || [],
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Search failed' });
  }
});

router.get('/suggestions', async (req, res) => {
  try {
    const query = (req.query.query || req.query.q || '') as string;
    if (!query) {
      return res.json({ suggestions: [] });
    }

    const gql = `
      query ($search: String) {
          Page(page: 1, perPage: 8) {
              media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                  id
                  title { romaji english }
                  coverImage { large }
                  format
                  status
                  startDate { year }
                  episodes
              }
          }
      }
    `;
    const data = await anilistQuery(gql, { search: query });
    const results = (data.Page?.media || []).map((item: any) => ({
      id: item.id,
      title: item.title?.english || item.title?.romaji,
      title_romaji: item.title?.romaji,
      poster: item.coverImage?.large,
      format: item.format,
      status: item.status,
      year: item.startDate?.year,
      episodes: item.episodes,
    }));
    res.json({ suggestions: results });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

const SORT_MAP: Record<string, string> = {
  SCORE_DESC: 'SCORE_DESC',
  POPULARITY_DESC: 'POPULARITY_DESC',
  TRENDING_DESC: 'TRENDING_DESC',
  START_DATE_DESC: 'START_DATE_DESC',
  FAVOURITES_DESC: 'FAVOURITES_DESC',
  UPDATED_AT_DESC: 'UPDATED_AT_DESC',
};

router.get('/filter', async (req, res) => {
  try {
    const genre = req.query.genre as string;
    const tag = req.query.tag as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const season = req.query.season ? (req.query.season as string).toUpperCase() : undefined;
    const format = req.query.format ? (req.query.format as string).toUpperCase() : undefined;
    const status = req.query.status ? (req.query.status as string).toUpperCase() : undefined;
    const sort = (req.query.sort as string) || 'POPULARITY_DESC';
    const page = parseInt((req.query.page as string) || '1', 10);
    const perPage = Math.min(50, Math.max(1, parseInt((req.query.per_page as string) || '20', 10)));

    const args = ['type: ANIME', `sort: [${SORT_MAP[sort] || 'POPULARITY_DESC'}]`];
    const variables: any = { page, perPage };

    if (genre) { args.push('genre: $genre'); variables.genre = genre; }
    if (tag) { args.push('tag: $tag'); variables.tag = tag; }
    if (year) { args.push('seasonYear: $seasonYear'); variables.seasonYear = year; }
    if (season) { args.push('season: $season'); variables.season = season; }
    if (format) { args.push('format: $format'); variables.format = format; }
    if (status) { args.push('status: $status'); variables.status = status; }

    const varTypes = ['$page: Int', '$perPage: Int'];
    if (genre) varTypes.push('$genre: String');
    if (tag) varTypes.push('$tag: String');
    if (year) varTypes.push('$seasonYear: Int');
    if (season) varTypes.push('$season: MediaSeason');
    if (format) varTypes.push('$format: MediaFormat');
    if (status) varTypes.push('$status: MediaStatus');

    const gql = `
      query (${varTypes.join(', ')}) {
          Page(page: $page, perPage: $perPage) {
              pageInfo { total currentPage lastPage hasNextPage perPage }
              media(${args.join(', ')}) {
                  ${MEDIA_LIST_FIELDS}
              }
          }
      }
    `;
    const data = await anilistQuery(gql, variables);
    const pageData = data.Page || {};
    const pageInfo = pageData.pageInfo || {};
    res.json({
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: pageInfo.hasNextPage || false,
      results: pageData.media || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Filter request failed' });
  }
});

router.get('/spotlight', async (req, res) => {
  try {
    const gql = `
      query {
          Page(page: 1, perPage: 10) {
              media(sort: [TRENDING_DESC, POPULARITY_DESC], type: ANIME) {
                  ${MEDIA_LIST_FIELDS}
              }
          }
      }
    `;
    const data = await anilistQuery(gql);
    res.json({ results: data.Page?.media || [] });
  } catch (err) {
    res.status(500).json({ error: 'Spotlight query failed' });
  }
});

router.get('/trending', async (req, res) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const perPage = parseInt((req.query.per_page as string) || '20', 10);
  res.json(await fetchCollection('TRENDING_DESC', undefined, page, perPage));
});

router.get('/popular', async (req, res) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const perPage = parseInt((req.query.per_page as string) || '20', 10);
  res.json(await fetchCollection('POPULARITY_DESC', undefined, page, perPage));
});

router.get('/upcoming', async (req, res) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const perPage = parseInt((req.query.per_page as string) || '20', 10);
  res.json(await fetchCollection('POPULARITY_DESC', 'NOT_YET_RELEASED', page, perPage));
});

router.get('/recent', async (req, res) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const perPage = parseInt((req.query.per_page as string) || '20', 10);
  res.json(await fetchCollection('START_DATE_DESC', 'RELEASING', page, perPage));
});

router.get('/schedule', async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const perPage = parseInt((req.query.per_page as string) || '20', 10);

    const gql = `
      query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
              pageInfo { total currentPage lastPage hasNextPage perPage }
              airingSchedules(notYetAired: true, sort: TIME) {
                  episode
                  airingAt
                  timeUntilAiring
                  media {
                      ${MEDIA_LIST_FIELDS}
                  }
              }
          }
      }
    `;
    const data = await anilistQuery(gql, { page, perPage });
    const pageData = data.Page || {};
    const pageInfo = pageData.pageInfo || {};
    const results = (pageData.airingSchedules || []).map((item: any) => {
      const entry = item.media || {};
      entry.next_episode = item.episode;
      entry.airingAt = item.airingAt;
      entry.timeUntilAiring = item.timeUntilAiring;
      return entry;
    });

    res.json({
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: pageInfo.hasNextPage || false,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: 'Schedule query failed' });
  }
});

router.get('/anime/search', async (req, res) => {
  const q = req.query.q || req.query.query;
  req.query.query = q;
  const page = parseInt((req.query.page as string) || '1', 10);
  const perPage = parseInt((req.query.per_page as string) || '20', 10);

  const gql = `
    query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage perPage }
            media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                ${MEDIA_LIST_FIELDS}
            }
        }
    }
  `;
  try {
    const data = await anilistQuery(gql, { search: q, page, perPage });
    const pageData = data.Page || {};
    const pageInfo = pageData.pageInfo || {};
    res.json({
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: pageInfo.hasNextPage || false,
      results: pageData.media || [],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Anime search failed' });
  }
});

router.get('/info/:anilist_id', async (req, res) => {
  try {
    const id = parseInt(req.params.anilist_id, 10);
    const gql = `
      query ($id: Int) {
          Media(id: $id, type: ANIME) {
              ${MEDIA_FULL_FIELDS}
          }
      }
    `;
    const data = await anilistQuery(gql, { id });
    if (!data.Media) {
      return res.status(404).json({ error: 'Anime not found' });
    }
    res.json(data.Media);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Anime info query failed' });
  }
});

router.get('/anime/:anilist_id', async (req, res) => {
  try {
    const id = parseInt(req.params.anilist_id, 10);
    const gql = `
      query ($id: Int) {
          Media(id: $id, type: ANIME) {
              ${MEDIA_FULL_FIELDS}
          }
      }
    `;
    const infoData = await anilistQuery(gql, { id });
    let episodes: any = null;
    try {
      episodes = await fetchEpisodesWithSlugs(id);
    } catch (e: any) {
      episodes = { error: { status: e.status || 500, detail: e.message || 'Failed to fetch episodes' } };
    }
    res.json({ info: infoData.Media, episodes });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Anime query failed' });
  }
});

router.get('/anime/:anilist_id/characters', async (req, res) => {
  try {
    const id = parseInt(req.params.anilist_id, 10);
    const page = parseInt((req.query.page as string) || '1', 10);
    const perPage = parseInt((req.query.per_page as string) || '25', 10);

    const gql = `
      query ($id: Int, $page: Int, $perPage: Int) {
          Media(id: $id, type: ANIME) {
              id
              title { romaji english }
              characters(sort: [ROLE, RELEVANCE], page: $page, perPage: $perPage) {
                  pageInfo { total currentPage lastPage hasNextPage perPage }
                  edges {
                      role
                      node {
                          id
                          name { full native userPreferred }
                          image { large medium }
                          description
                          gender
                          dateOfBirth { year month day }
                          age
                          favourites
                          siteUrl
                      }
                      voiceActors {
                          id
                          name { full native }
                          image { large }
                          languageV2
                      }
                  }
              }
          }
      }
    `;
    const data = await anilistQuery(gql, { id, page, perPage });
    const media = data.Media;
    if (!media) return res.status(404).json({ error: 'Anime not found' });

    const chars = media.characters || {};
    const pageInfo = chars.pageInfo || {};
    res.json({
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: pageInfo.hasNextPage || false,
      characters: chars.edges || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Characters query failed' });
  }
});

router.get('/anime/:anilist_id/relations', async (req, res) => {
  try {
    const id = parseInt(req.params.anilist_id, 10);
    const gql = `
      query ($id: Int) {
          Media(id: $id, type: ANIME) {
              id
              title { romaji english }
              relations {
                  edges {
                      relationType(version: 2)
                      node {
                          id
                          title { romaji english native }
                          coverImage { large }
                          bannerImage
                          format
                          type
                          status
                          episodes
                          chapters
                          meanScore
                          averageScore
                          popularity
                          startDate { year month day }
                      }
                  }
              }
          }
      }
    `;
    const data = await anilistQuery(gql, { id });
    if (!data.Media) return res.status(404).json({ error: 'Anime not found' });
    res.json({
      id: data.Media.id,
      title: data.Media.title,
      relations: data.Media.relations?.edges || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Relations query failed' });
  }
});

router.get('/anime/:anilist_id/recommendations', async (req, res) => {
  try {
    const id = parseInt(req.params.anilist_id, 10);
    const page = parseInt((req.query.page as string) || '1', 10);
    const perPage = parseInt((req.query.per_page as string) || '10', 10);

    const gql = `
      query ($id: Int, $page: Int, $perPage: Int) {
          Media(id: $id, type: ANIME) {
              id
              title { romaji english }
              recommendations(sort: RATING_DESC, page: $page, perPage: $perPage) {
                  pageInfo { total currentPage lastPage hasNextPage perPage }
                  nodes {
                      rating
                      mediaRecommendation {
                          id
                          title { romaji english native }
                          coverImage { large extraLarge }
                          bannerImage
                          format
                          episodes
                          status
                          meanScore
                          averageScore
                          popularity
                          genres
                          startDate { year }
                      }
                  }
              }
          }
      }
    `;
    const data = await anilistQuery(gql, { id, page, perPage });
    if (!data.Media) return res.status(404).json({ error: 'Anime not found' });
    const recs = data.Media.recommendations || {};
    const pageInfo = recs.pageInfo || {};
    res.json({
      page: pageInfo.currentPage || page,
      perPage: pageInfo.perPage || perPage,
      total: pageInfo.total || 0,
      hasNextPage: pageInfo.hasNextPage || false,
      recommendations: recs.nodes || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Recommendations query failed' });
  }
});

router.get('/episodes/:anilist_id', async (req, res) => {
  try {
    const id = parseInt(req.params.anilist_id, 10);
    const data = await fetchEpisodesWithSlugs(id);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Episodes fetch failed', body: err.body });
  }
});

router.get('/sources', async (req, res) => {
  try {
    const episodeId = req.query.episodeId as string;
    const provider = req.query.provider as string;
    const anilistId = parseInt(req.query.anilistId as string, 10);
    const category = (req.query.category as string) || 'sub';

    if (!episodeId || !provider || !anilistId) {
      return res.status(400).json({ error: 'episodeId, provider, and anilistId are required' });
    }

    if (PY_API_BASE) {
      try {
        const qs = `episodeId=${encodeURIComponent(episodeId)}&provider=${encodeURIComponent(provider)}&anilistId=${anilistId}&category=${encodeURIComponent(category)}`;
        const data = await pyApiFetch(`/sources?${qs}`);
        return res.json(data);
      } catch (e: any) {
        console.error('[lovely-anime-api] sources fetch failed, falling back to direct Miruro:', e.message || e);
      }
    }

    const data = await fetchSources(episodeId, provider, anilistId, category);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Sources fetch failed' });
  }
});

router.get('/watch/:provider/:anilist_id/:category/:slug', async (req, res) => {
  try {
    const provider = req.params.provider;
    const anilistId = parseInt(req.params.anilist_id, 10);
    const category = req.params.category;
    const slug = req.params.slug;

    const data = await fetchSourcesForSlug(provider, anilistId, category, slug);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Watch sources fetch failed' });
  }
});

const AUTO_PROVIDER_ORDER = ['moo', 'ally', 'bonk', 'bee', 'kiwi', 'pewe', 'hop'];

function buildDownloadResponse(data: any, anilistId: number, provider: string, targetId: string) {
  const downloads = [];
  for (const s of data.streams || []) {
    if (s.type === 'mp4') {
      downloads.push({
        url: s.url,
        quality: s.quality,
        resolution: s.resolution,
        codec: s.codec,
        fansub: s.fansub,
      });
    }
  }

  if (downloads.length === 0) {
    return {
      anilist_id: anilistId,
      provider,
      episode: targetId,
      download_url: null,
      downloads: [],
      note: 'No direct MP4 stream for this provider — try /download/auto/... or a provider like moo/animegg',
    };
  }

  function getQualityKey(s: any) {
    const q = s.quality;
    try {
      return parseInt(String(q).toLowerCase().replace('p', ''), 10) || 0;
    } catch {
      return 0;
    }
  }

  const best = downloads.reduce((prev, current) => (getQualityKey(current) > getQualityKey(prev) ? current : prev), downloads[0]);
  return {
    anilist_id: anilistId,
    provider,
    episode: targetId,
    download_url: best.url,
    downloads,
  };
}

async function autoDirectDownload(anilistId: number, category: string, slug: string) {
  const parts = slug.split('-');
  const number = parseInt(parts[parts.length - 1], 10);
  if (isNaN(number)) {
    throw { status: 400, message: 'slug must end with episode number (e.g. animegg-1)' };
  }

  const raw = await fetchRawEpisodes(anilistId);
  const attempts: string[] = [];

  for (const prov of AUTO_PROVIDER_ORDER) {
    const epList = raw.providers?.[prov]?.episodes?.[category] || [];
    const target = epList.find((e: any) => e.number === number);
    if (!target || !target.id) continue;

    try {
      const data = await fetchSources(target.id, prov, anilistId, category);
      const resp = buildDownloadResponse(data, anilistId, prov, target.id);
      if (resp.download_url) {
        return resp;
      }
      attempts.push(`${prov}: no mp4 stream`);
    } catch (e: any) {
      attempts.push(`${prov}: HTTP ${e.status || 500}`);
    }
  }

  throw { status: 404, message: 'No direct MP4 download found on any provider', attempts };
}

router.get('/download/:provider/:anilist_id/:category/:slug', async (req, res) => {
  try {
    const provider = req.params.provider;
    const anilistId = parseInt(req.params.anilist_id, 10);
    const category = req.params.category;
    const slug = req.params.slug;

    const resp = await fetchDownloadForSlug(provider, anilistId, category, slug);
    res.json(resp);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Download lookup failed', attempts: err.attempts });
  }
});

function refererFor(url: string): string {
  if (url.includes('animegg')) return 'https://www.animegg.org/';
  if (url.includes('fast4speed')) return 'https://allmanga.to/';
  if (url.includes('ok.ru')) return 'https://ok.ru/';
  if (url.includes('vidtube')) return 'https://vidtube.site/';
  return 'https://www.animegg.org/';
}

router.get('/download/:provider/:anilist_id/:category/:slug/file', async (req, res) => {
  try {
    const provider = req.params.provider;
    const anilistId = parseInt(req.params.anilist_id, 10);
    const category = req.params.category;
    const slug = req.params.slug;
    const quality = req.query.quality as string;

    const resp = await fetchDownloadForSlug(provider, anilistId, category, slug);

    let url = resp.download_url;
    let usedQuality = null;

    if (quality && resp.downloads?.length) {
      const q = quality.trim().toLowerCase();
      const match = resp.downloads.find((s: any) => String(s.quality || '').toLowerCase() === q);
      if (match) {
        url = match.url;
        usedQuality = match.quality;
      }
    }

    if (!url) {
      return res.status(404).json({ error: 'No direct MP4 available for this episode/provider' });
    }

    const referer = refererFor(url);
    const fetchHeaders: Record<string, string> = {
      'User-Agent': HEADERS['User-Agent'],
      'Referer': referer,
      'Origin': referer.replace(/\/$/, ''),
      'Accept': '*/*',
    };

    const mediaRes = await fetch(url, { headers: fetchHeaders });
    if (!mediaRes.ok || !mediaRes.body) {
      return res.status(mediaRes.status || 500).json({ error: 'CDN refused the download request' });
    }

    const fname = `${anilistId}-${provider}-${category}-${slug}-${usedQuality || 'best'}.mp4`;
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);

    // Stream native web ReadableStream to Express response
    const reader = (mediaRes.body as any).getReader();
    async function stream() {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    }
    stream().catch((e) => {
      console.error('Error streaming MP4 file:', e);
      if (!res.headersSent) res.status(500).end();
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'File download failed' });
  }
});

// Mount router under /api AND root level so both work!
app.use('/api', router);
app.use('/', router);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
