import React, { useState, useEffect } from 'react';
import { Code, Terminal, Play, Download, Copy, Check, Sparkles, ExternalLink, RefreshCw, AlertTriangle, Send, Zap, Server } from 'lucide-react';

export const ApiPortalView: React.FC = () => {
  const [testPath, setTestPath] = useState('/search?query=naruto&per_page=3');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [jsonOutput, setJsonOutput] = useState<string>('Click "Execute Request" to test endpoint live...');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [codeLang, setCodeLang] = useState<'curl' | 'js' | 'python'>('curl');

  // Step flow state
  const [flowQuery, setFlowQuery] = useState('naruto shippuden');
  const [flowSearchRes, setFlowSearchRes] = useState<any[]>([]);
  const [flowLoading, setFlowLoading] = useState(false);
  const [flowSelectedAnime, setFlowSelectedAnime] = useState<any | null>(null);
  const [flowProvider, setFlowProvider] = useState('auto');
  const [flowCategory, setFlowCategory] = useState('sub');
  const [flowEpNum, setFlowEpNum] = useState('1');
  const [flowDlRes, setFlowDlRes] = useState<any | null>(null);
  const [flowDlLoading, setFlowDlLoading] = useState(false);

  const handleExecute = async (path: string = testPath) => {
    setLoading(true);
    setResponseStatus(null);
    setResponseTime(null);
    setJsonOutput('Sending request to server...');

    const startTime = performance.now();
    try {
      const res = await fetch(`/api${path.startsWith('/') ? path : '/' + path}`);
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      setResponseStatus(res.status);

      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        setJsonOutput(JSON.stringify(parsed, null, 2));
      } catch {
        setJsonOutput(text);
      }
    } catch (err: any) {
      setResponseStatus(500);
      setJsonOutput(`Error sending request: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleExecute('/search?query=naruto&per_page=3');
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCodeSnippet = () => {
    const fullUrl = `${window.location.origin}/api${testPath.startsWith('/') ? testPath : '/' + testPath}`;
    if (codeLang === 'curl') {
      return `curl -X GET "${fullUrl}" \\\n  -H "Accept: application/json"`;
    }
    if (codeLang === 'js') {
      return `fetch("${fullUrl}")\n  .then(res => res.json())\n  .then(data => console.log(data));`;
    }
    if (codeLang === 'python') {
      return `import httpx\n\nresponse = httpx.get("${fullUrl}")\nprint(response.json())`;
    }
    return '';
  };

  // Flow handlers
  const handleFlowSearch = async () => {
    if (!flowQuery.trim()) return;
    setFlowLoading(true);
    setFlowSelectedAnime(null);
    setFlowDlRes(null);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(flowQuery)}&per_page=6`);
      const data = await res.json();
      setFlowSearchRes(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFlowLoading(false);
    }
  };

  const handleFlowGetDl = async () => {
    if (!flowSelectedAnime) return;
    setFlowDlLoading(true);
    setFlowDlRes(null);
    const slug = `animegg-${flowEpNum}`;
    try {
      const res = await fetch(`/api/download/${flowProvider}/${flowSelectedAnime.id}/${flowCategory}/${slug}`);
      const data = await res.json();
      setFlowDlRes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFlowDlLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10 text-slate-100">
      {/* Cloudflare & Hosting Warning Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-300 font-bold">Hosting Notice & Cloudflare Pipe Protection:</strong>
          <p className="mt-1 leading-relaxed text-amber-200/90">
            Miruro uses Cloudflare protection on the pipe endpoint. Avoid datacenter proxies or Vercel IPs when deploying standalone copies. This API endpoint server handles base64 request encoding, gzip decompression, and streaming headers automatically.
          </p>
        </div>
      </div>

      {/* Hero Intro */}
      <div className="text-center space-y-3 py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 text-pink-400" />
          Lovely Anime REST & Miruro Scraper API v3.0
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-pink-400 bg-clip-text text-transparent">
          Interactive API Documentation & Tester
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Full reverse-engineered anime endpoints: AniList metadata, Miruro streams, HLS sources, and direct MP4 file downloads.
        </p>
      </div>

      {/* Main Grid: Tester & Code Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: API Playground */}
        <div className="lg:col-span-7 bg-[#0a0d1d] border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-pink-400" />
              <h2 className="text-base font-bold">Live Request Tester</h2>
            </div>
            {responseStatus && (
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  responseStatus === 200 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  HTTP {responseStatus}
                </span>
                {responseTime && (
                  <span className="text-xs font-mono text-slate-400">{responseTime}ms</span>
                )}
              </div>
            )}
          </div>

          {/* URL Input Bar */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Endpoint Path:</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-400 select-none">
                GET /api
              </span>
              <input
                type="text"
                value={testPath}
                onChange={(e) => setTestPath(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 focus:border-pink-500/50 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 outline-none"
              />
              <button
                onClick={() => handleExecute()}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs shadow-lg shadow-pink-500/30 transition-all flex items-center gap-2 flex-shrink-0"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Execute</span>
              </button>
            </div>
          </div>

          {/* JSON Output View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Response JSON Output:</span>
              <button
                onClick={() => handleCopy(jsonOutput, 'json')}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                {copiedCode === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'json' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="w-full h-80 bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-xs text-slate-300 overflow-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
              {jsonOutput}
            </pre>
          </div>
        </div>

        {/* Right Column: Code Snippets & Shortcuts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Endpoint Shortcuts */}
          <div className="bg-[#0a0d1d] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200">Sample API Endpoints</h3>
            <div className="space-y-2">
              {[
                { name: 'Search Anime', path: '/search?query=naruto' },
                { name: 'Trending Spotlights', path: '/spotlight' },
                { name: 'Anime Details & Episodes', path: '/anime/21' },
                { name: 'Streaming HLS Sources', path: '/watch/kiwi/178005/sub/animepahe-1' },
                { name: 'Direct MP4 Downloads', path: '/download/auto/178005/sub/animepahe-1' },
                { name: 'Upcoming Airing Schedule', path: '/schedule' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTestPath(item.path);
                    handleExecute(item.path);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-left text-xs transition-all group"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-pink-400 transition-colors">{item.name}</span>
                  <span className="font-mono text-[10px] text-slate-500 group-hover:text-slate-300">{item.path}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generated Code Snippet */}
          <div className="bg-[#0a0d1d] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">Client Code Generator</h3>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                {(['curl', 'js', 'python'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLang(lang)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      codeLang === lang ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-[11px] text-pink-300 overflow-x-auto leading-relaxed">
                {getCodeSnippet()}
              </pre>
              <button
                onClick={() => handleCopy(getCodeSnippet(), 'snippet')}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-all"
              >
                {copiedCode === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Direct Download Flow Section */}
      <div className="bg-[#0a0d1d] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="border-b border-white/10 pb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-400">Interactive Flow Tester</span>
          <h2 className="text-xl font-bold text-white mt-1">Search → Select Anime → Extract MP4 Links</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1: Search */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="text-xs font-bold uppercase text-slate-200">Search Anime</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={flowQuery}
                onChange={(e) => setFlowQuery(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none"
              />
              <button
                onClick={handleFlowSearch}
                className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold"
              >
                Search
              </button>
            </div>

            {flowLoading ? (
              <p className="text-xs text-slate-400">Searching...</p>
            ) : flowSearchRes.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {flowSearchRes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setFlowSelectedAnime(r)}
                    className={`w-full text-left p-2 rounded-xl text-xs transition-all border ${
                      flowSelectedAnime?.id === r.id
                        ? 'bg-pink-500/20 border-pink-500/50 text-pink-300 font-bold'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {r.title?.english || r.title?.romaji || r.id}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Step 2: Configure Episode & Provider */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="text-xs font-bold uppercase text-slate-200">Configure Episode</h3>
            </div>

            {flowSelectedAnime ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-pink-400 truncate">
                  Selected: {flowSelectedAnime.title?.english || flowSelectedAnime.title?.romaji}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block font-semibold mb-1">Provider:</label>
                    <select
                      value={flowProvider}
                      onChange={(e) => setFlowProvider(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-slate-200"
                    >
                      <option value="auto" className="bg-slate-900">auto (best MP4)</option>
                      <option value="kiwi" className="bg-slate-900">kiwi</option>
                      <option value="moo" className="bg-slate-900">moo</option>
                      <option value="zoro" className="bg-slate-900">zoro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block font-semibold mb-1">Category:</label>
                    <select
                      value={flowCategory}
                      onChange={(e) => setFlowCategory(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-slate-200"
                    >
                      <option value="sub" className="bg-slate-900">SUB</option>
                      <option value="dub" className="bg-slate-900">DUB</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block font-semibold mb-1">Episode Number:</label>
                  <input
                    type="number"
                    value={flowEpNum}
                    onChange={(e) => setFlowEpNum(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>

                <button
                  onClick={handleFlowGetDl}
                  className="w-full py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs"
                >
                  Get MP4 Links
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Select an anime in Step 1 first...</p>
            )}
          </div>

          {/* Step 3: Result Links */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-bold flex items-center justify-center">3</span>
              <h3 className="text-xs font-bold uppercase text-slate-200">Extracted MP4 Downloads</h3>
            </div>

            {flowDlLoading ? (
              <p className="text-xs text-slate-400">Extracting stream links...</p>
            ) : flowDlRes ? (
              <div className="space-y-2">
                {flowDlRes.download_url ? (
                  <>
                    <a
                      href={`/api/download/${flowProvider}/${flowSelectedAnime.id}/${flowCategory}/animegg-${flowEpNum}/file`}
                      download
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Best MP4
                    </a>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                      {flowDlRes.downloads?.map((d: any, i: number) => (
                        <div key={i} className="p-2 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono break-all text-slate-300">
                          <span className="text-pink-400 font-bold">{d.quality || 'MP4'}:</span> {d.url}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-amber-300 font-medium">{flowDlRes.note || 'No direct MP4 link found.'}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Click "Get MP4 Links" in Step 2...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
