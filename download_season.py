#!/usr/bin/env python3
"""
Batch download a whole season of anime through the Lovely Anime API /file endpoint.

Usage examples:
  python download_season.py --id 1735                          # all episodes, best quality
  python download_season.py --search "naruto shippuden"        # resolve id from a search
  python download_season.py --id 1735 --quality 480p           # pick a quality
  python download_season.py --id 1735 --start 1 --end 24 -o naruto-s01
  python download_season.py --id 1735 --dub --quality 720p     # dubbed audio
  python download_season.py --id 1735 --dry-run                # list what would download

Notes:
  - Requires the API to be running (default http://127.0.0.1:8000).
  - The /file endpoint always fetches a fresh stream, so links never go stale.
  - Existing files are skipped by default (safe to re-run / resume).
"""

import argparse
import re
import sys
import time
from pathlib import Path

import httpx

DEFAULT_BASE = "http://127.0.0.1:8000"


def safe_name(s: str) -> str:
    """Strip characters that are invalid in Windows filenames."""
    s = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", s or "")
    s = re.sub(r"\s+", " ", s).strip(" .")
    return s[:80] or "anime"


def fetch_json(base: str, path: str, retries: int = 3, timeout: float = 60.0) -> dict:
    url = base.rstrip("/") + path
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            with httpx.Client(timeout=timeout, follow_redirects=True) as client:
                r = client.get(url)
            if r.status_code == 200:
                return r.json()
            last_err = f"HTTP {r.status_code}"
        except httpx.HTTPError as e:
            last_err = str(e)
        print(f"  ! retry {attempt}/{retries} for {url}: {last_err}", file=sys.stderr)
        time.sleep(2 * attempt)
    raise SystemExit(f"Failed to fetch {url}: {last_err}")


def resolve_anime_id(base: str, anime_id: int | None, search: str | None, pick: int) -> int:
    if anime_id is not None:
        return anime_id
    if not search:
        raise SystemExit("Provide --id <anilist-id> or --search \"<title>\"")
    data = fetch_json(base, f"/anime/search?q={search}&per_page=8")
    results = data.get("results") or data.get("data") or []
    if not results:
        raise SystemExit(f"No anime found for search: {search!r}")
    print("Search results:")
    for i, item in enumerate(results):
        t = item.get("title") or {}
        name = t.get("romaji") or t.get("english") or t.get("native") or "?"
        eps = item.get("episodes")
        print(f"  [{i}] id={item.get('id')}  {name}  (episodes: {eps})")
    idx = pick if pick is not None else 0
    if not (0 <= idx < len(results)):
        raise SystemExit(f"--pick {idx} out of range (0-{len(results) - 1})")
    chosen = results[idx]
    print(f"Using: id={chosen.get('id')} {(chosen.get('title') or {}).get('romaji', '')}")
    return chosen["id"]


def get_anime_info(base: str, anime_id: int) -> tuple[str, int]:
    """Return (title, episode_count). Episode count falls back to 1 (movies/ONAs)."""
    info = fetch_json(base, f"/info/{anime_id}")
    title = info.get("title") or {}
    name = title.get("romaji") or title.get("english") or title.get("native") or str(anime_id)
    eps = info.get("episodes") or 0
    return safe_name(name), int(eps)


def format_size(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{int(n)} B"
        n /= 1024


def download_episode(
    base: str,
    provider: str,
    anime_id: int,
    category: str,
    ep: int,
    quality: str | None,
    out_dir: Path,
    title: str,
    retries: int,
) -> str:
    """Download one episode. Returns 'ok', 'skipped', or raises on final failure."""
    url = f"{base}/download/{provider}/{anime_id}/{category}/{ep}/file"
    params = {"quality": quality} if quality else None

    # Files are saved with a quality suffix (e.g. "... - E001 - 360p.mp4"),
    # so check by glob, not by one exact name.
    existing = list(out_dir.glob(f"{title} - E{ep:03d}*.mp4"))
    if existing and existing[0].stat().st_size > 0:
        print(f"  E{ep:03d}: already exists, skipping ({format_size(existing[0].stat().st_size)})")
        return "skipped"
    # Remove stale partials from an interrupted run (no HTTP Range resume).
    for stale in out_dir.glob(f"{title} - E{ep:03d}*.part"):
        stale.unlink()

    last_err = None
    for attempt in range(1, retries + 1):
        try:
            with httpx.Client(timeout=None, follow_redirects=True) as client:
                with client.stream("GET", url, params=params) as r:
                    if r.status_code != 200:
                        raise RuntimeError(f"HTTP {r.status_code}")
                    total = int(r.headers.get("content-length") or 0)

                    # The server names the file with the quality actually served
                    # (e.g. "...-480p.mp4" or "...-best.mp4" on fallback).
                    cd = r.headers.get("content-disposition", "")
                    m = re.search(r'filename="([^"]+)"', cd)
                    actual = "best"
                    if m:
                        stem = m.group(1).rsplit(".", 1)[0]
                        actual = stem.rsplit("-", 1)[-1]
                    if actual == "best" and quality:
                        actual = quality
                    final = out_dir / f"{title} - E{ep:03d} - {actual}.mp4"

                    tmp = final.with_suffix(final.suffix + ".part")
                    done, last_t, last_bytes = 0, time.time(), 0
                    with open(tmp, "wb") as f:
                        for chunk in r.iter_bytes(1024 * 256):
                            f.write(chunk)
                            done += len(chunk)
                            now = time.time()
                            if now - last_t >= 1.0:
                                speed = (done - last_bytes) / (now - last_t)
                                pct = f"{done / total * 100:5.1f}%" if total else ""
                                print(
                                    f"\r  E{ep:03d}: {format_size(done)} {format_size(speed)}/s   ",
                                    end="", flush=True,
                                )
                                last_t, last_bytes = now, done
                    print(f"\r  E{ep:03d}: done  {format_size(done)}  ->  {final.name}   ")
                    tmp.replace(final)
                    return "ok"
        except (httpx.HTTPError, RuntimeError, OSError) as e:
            last_err = e
            print(f"    ! attempt {attempt}/{retries} failed: {e}", file=sys.stderr)
            time.sleep(2 * attempt)
    raise SystemExit(f"E{ep:03d}: download failed after {retries} attempts: {last_err}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Batch-download a season via the /file endpoint")
    ap.add_argument("--id", type=int, help="AniList id of the anime")
    ap.add_argument("--search", "-s", help="search the API for the anime instead of --id")
    ap.add_argument("--pick", type=int, help="which search result to use (default: first)")
    ap.add_argument("--quality", "-q", help="e.g. 480p / 720p / 1080p (default: best available)")
    ap.add_argument("--category", "-c", default="sub", choices=["sub", "dub"], help="audio track (default: sub)")
    ap.add_argument("--provider", default="auto", help="provider, e.g. auto, moo, ally (default: auto)")
    ap.add_argument("--start", type=int, default=1, help="first episode number (default: 1)")
    ap.add_argument("--end", type=int, help="last episode number (default: last episode of the anime)")
    ap.add_argument("--out", "-o", default="downloads", help="output directory (default: downloads)")
    ap.add_argument("--base", default=DEFAULT_BASE, help=f"API base URL (default: {DEFAULT_BASE})")
    ap.add_argument("--retries", type=int, default=3, help="download retries per episode (default: 3)")
    ap.add_argument("--delay", type=float, default=0.5, help="seconds to wait between episodes (default: 0.5)")
    ap.add_argument("--force", action="store_true", help="re-download even if the file exists")
    ap.add_argument("--dry-run", action="store_true", help="only list what would be downloaded")
    args = ap.parse_args()

    base = args.base.rstrip("/")

    print(f"== Lovely Anime batch downloader ==")
    print(f"API: {base}")
    anime_id = resolve_anime_id(base, args.id, args.search, args.pick)
    title, total_eps = get_anime_info(base, anime_id)
    print(f"Anime: {title}  (id={anime_id}, episodes={total_eps})")

    start = max(1, args.start)
    end = args.end if args.end is not None else (total_eps if total_eps else start)
    end = max(start, end)
    if total_eps:
        end = min(end, total_eps)
    episodes = list(range(start, end + 1))
    qual = args.quality or "best"
    print(f"Plan: episodes {start}-{end} ({len(episodes)} total) | {args.category} | quality: {qual} | provider: {args.provider}")
    print(f"URL pattern: {base}/download/{args.provider}/{anime_id}/{args.category}/<ep>/file"
          + (f"?quality={args.quality}" if args.quality else ""))

    out_dir = Path(args.out)
    if not args.dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)

    if args.dry_run:
        for ep in episodes:
            q = f"?quality={args.quality}" if args.quality else ""
            print(f"  E{ep:03d}  {base}/download/{args.provider}/{anime_id}/{args.category}/{ep}/file{q}")
        print(f"\nDry run only - {len(episodes)} episodes would download to: {out_dir.resolve()}")
        return

    ok = skipped = 0
    failed = []
    for i, ep in enumerate(episodes, 1):
        print(f"[{i}/{len(episodes)}] episode {ep}:")
        try:
            result = download_episode(
                base, args.provider, anime_id, args.category, ep,
                args.quality, out_dir, title, args.retries,
            )
            if result == "ok":
                ok += 1
            else:
                skipped += 1
        except SystemExit as e:
            failed.append((ep, str(e)))
            print(f"  E{ep:03d}: FAILED - {e}", file=sys.stderr)
        if args.delay and i < len(episodes):
            time.sleep(args.delay)

    print("\n== Summary ==")
    print(f"Downloaded: {ok}   Skipped (already present): {skipped}   Failed: {len(failed)}")
    if failed:
        for ep, err in failed:
            print(f"  E{ep:03d}: {err}")
    print(f"Files in: {out_dir.resolve()}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
