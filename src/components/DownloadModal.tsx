import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Check, Loader2, AlertCircle, Film, ExternalLink } from 'lucide-react';
import { DownloadResponse } from '../types';

interface DownloadModalProps {
  anilistId: number;
  provider: string;
  category: string;
  epNum: number;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  anilistId,
  provider,
  category,
  epNum,
  onClose,
}) => {
  const [downloadData, setDownloadData] = useState<DownloadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('');

  const slug = `animegg-${epNum}`; // default slug convention used by API

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/download/${provider}/${anilistId}/${category}/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.error) {
          setError(data.error.message || data.error || 'Failed to fetch direct download options');
        } else {
          setDownloadData(data);
          if (data.downloads && data.downloads.length > 0) {
            setSelectedQuality(data.downloads[0].quality || '');
          }
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Error loading download links');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [anilistId, provider, category, slug, epNum]);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const fileProxyUrl = `/api/download/${provider}/${anilistId}/${category}/${slug}/file${
    selectedQuality ? `?quality=${encodeURIComponent(selectedQuality)}` : ''
  }`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0a0d1d] border border-white/15 rounded-3xl p-6 shadow-2xl text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Direct MP4 Download</h3>
              <p className="text-[11px] text-slate-400">Episode {epNum} • Provider: {provider}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="py-6 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
              <p className="text-xs font-semibold">Extracting direct MP4 download links...</p>
            </div>
          ) : error || !downloadData?.downloads?.length ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs font-bold text-rose-300">{error || downloadData?.note || 'No direct MP4 streams available for this provider.'}</p>
              <p className="text-[11px] text-slate-400">
                Tip: Try selecting provider "auto" or "kiwi" / "moo" for best MP4 availability.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quality selector */}
              {downloadData.downloads.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Select Resolution:</label>
                  <div className="flex flex-wrap gap-2">
                    {downloadData.downloads.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedQuality(d.quality || '')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedQuality === d.quality
                            ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                        }`}
                      >
                        {d.quality || `Stream ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Download Action Button */}
              <a
                href={fileProxyUrl}
                download
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold text-xs shadow-xl shadow-pink-500/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download MP4 File ({selectedQuality || 'Best'})</span>
              </a>

              {/* Direct Links List */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Raw CDN Links:
                </span>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {downloadData.downloads.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-pink-400">{d.quality || 'MP4 Stream'}</span>
                        <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{d.url}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(d.url)}
                        className="p-2 bg-white/5 hover:bg-white/15 rounded-xl border border-white/10 text-slate-300 transition-all flex-shrink-0"
                        title="Copy direct URL"
                      >
                        {copiedUrl === d.url ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
