import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CastMember,
  Episode,
  SearchResult,
  ShowDetail,
  ShowSummary,
  WatchStatus,
  WatchlistEntry,
} from "./types";

const API_ROOT = "https://api.tvmaze.com";
const WATCHLIST_STORAGE_KEY = "nightshift029-watchlist";
const DEFAULT_QUERY = "science fiction";
const WATCH_STATUSES: WatchStatus[] = ["planned", "watching", "completed"];

type SortOption = "score" | "name" | "rating" | "premiered";
type StatusFilter = "all" | WatchStatus | "untracked";

interface DetailState {
  show: ShowDetail;
  cast: CastMember[];
  episodes: Episode[];
}

interface UpcomingItem {
  showId: number;
  showName: string;
  episodeName: string;
  season: number;
  number: number;
  airdate: string;
  status: WatchStatus;
}

function normalizeShow(raw: any): ShowSummary {
  return {
    id: raw.id,
    name: raw.name,
    premiered: raw.premiered ?? null,
    ended: raw.ended ?? null,
    status: raw.status ?? "Unknown",
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    language: raw.language ?? null,
    rating: raw.rating?.average ?? null,
    network: raw.network?.name ?? raw.webChannel?.name ?? null,
    schedule: {
      time: raw.schedule?.time ?? "",
      days: Array.isArray(raw.schedule?.days) ? raw.schedule.days : [],
    },
    image: raw.image?.original ?? raw.image?.medium ?? null,
    summary: raw.summary ?? null,
  };
}

function formatDate(value: string | null): string {
  if (!value) return "TBA";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

function stripHtml(input: string | null): string {
  return input ? input.replace(/<[^>]+>/g, "").trim() : "";
}

function readWatchlist(): Record<number, WatchlistEntry> {
  const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<number, WatchlistEntry>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeWatchlist(data: Record<number, WatchlistEntry>) {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(data));
}

function sortResults(results: SearchResult[], sort: SortOption): SearchResult[] {
  const sorted = [...results];
  sorted.sort((left, right) => {
    if (sort === "name") return left.show.name.localeCompare(right.show.name);
    if (sort === "rating") return (right.show.rating ?? -1) - (left.show.rating ?? -1);
    if (sort === "premiered") {
      return (right.show.premiered ?? "").localeCompare(left.show.premiered ?? "");
    }
    return right.score - left.score;
  });
  return sorted;
}

function matchFilters(
  results: SearchResult[],
  searchText: string,
  statusFilter: StatusFilter,
  genreFilter: string,
  watchlist: Record<number, WatchlistEntry>,
): SearchResult[] {
  const normalized = searchText.trim().toLowerCase();
  return results.filter(({ show }) => {
    const haystack = [
      show.name,
      show.network,
      show.language,
      ...show.genres,
      stripHtml(show.summary),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const watch = watchlist[show.id];
    const matchesSearch = !normalized || haystack.includes(normalized);
    const matchesGenre = genreFilter === "all" || show.genres.includes(genreFilter);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "untracked" ? !watch : watch?.status === statusFilter);
    return matchesSearch && matchesGenre && matchesStatus;
  });
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`);
  if (!response.ok) {
    throw new Error(`TVMaze request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export default function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [searchText, setSearchText] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [watchlist, setWatchlist] = useState<Record<number, WatchlistEntry>>(() => readWatchlist());
  const [upcomingEpisodes, setUpcomingEpisodes] = useState<UpcomingItem[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    writeWatchlist(watchlist);
  }, [watchlist]);

  useEffect(() => {
    let isActive = true;
    setResultsLoading(true);
    setResultsError(null);

    fetchJson<any[]>(`/search/shows?q=${encodeURIComponent(query)}`)
      .then((payload) => {
        if (!isActive) return;
        const nextResults = payload.map((item) => ({
          score: item.score ?? 0,
          show: normalizeShow(item.show),
        }));
        setResults(nextResults);
        setSelectedShowId((current) => current ?? nextResults[0]?.show.id ?? null);
      })
      .catch((error: Error) => {
        if (!isActive) return;
        setResultsError(error.message);
      })
      .finally(() => {
        if (isActive) setResultsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [query]);

  useEffect(() => {
    if (!selectedShowId) return;
    let isActive = true;
    setDetailLoading(true);
    setDetailError(null);

    Promise.all([
      fetchJson<any>(`/shows/${selectedShowId}`),
      fetchJson<any[]>(`/shows/${selectedShowId}/cast`),
      fetchJson<any[]>(`/shows/${selectedShowId}/episodes`),
    ])
      .then(([showPayload, castPayload, episodesPayload]) => {
        if (!isActive) return;
        setDetail({
          show: {
            ...normalizeShow(showPayload),
            officialSite: showPayload.officialSite ?? null,
            runtime: showPayload.runtime ?? null,
            averageRuntime: showPayload.averageRuntime ?? null,
            ended: showPayload.ended ?? null,
            externals: {
              imdb: showPayload.externals?.imdb ?? null,
            },
          },
          cast: castPayload,
          episodes: episodesPayload.map((episode) => ({
            id: episode.id,
            name: episode.name,
            season: episode.season,
            number: episode.number,
            airdate: episode.airdate ?? null,
            airtime: episode.airtime ?? null,
            runtime: episode.runtime ?? null,
          })),
        });
      })
      .catch((error: Error) => {
        if (!isActive) return;
        setDetailError(error.message);
      })
      .finally(() => {
        if (isActive) setDetailLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedShowId]);

  useEffect(() => {
    const entries = Object.values(watchlist);
    if (entries.length === 0) {
      setUpcomingEpisodes([]);
      setUpcomingError(null);
      return;
    }

    let isActive = true;
    setUpcomingLoading(true);
    setUpcomingError(null);
    const today = new Date().toISOString().slice(0, 10);

    Promise.all(
      entries.map(async (entry) => {
        const episodes = await fetchJson<any[]>(`/shows/${entry.show.id}/episodes`);
        const next = episodes.find((episode) => episode.airdate && episode.airdate >= today);
        if (!next) return null;
        return {
          showId: entry.show.id,
          showName: entry.show.name,
          episodeName: next.name,
          season: next.season,
          number: next.number,
          airdate: next.airdate,
          status: entry.status,
        } satisfies UpcomingItem;
      }),
    )
      .then((items) => {
        if (!isActive) return;
        const nextItems = items
          .filter((item): item is UpcomingItem => item !== null)
          .sort((left, right) => left.airdate.localeCompare(right.airdate))
          .slice(0, 8);
        setUpcomingEpisodes(nextItems);
      })
      .catch((error: Error) => {
        if (!isActive) return;
        setUpcomingError(error.message);
      })
      .finally(() => {
        if (isActive) setUpcomingLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [watchlist]);

  const genres = useMemo(() => {
    const found = new Set<string>();
    results.forEach(({ show }) => show.genres.forEach((genre) => found.add(genre)));
    return ["all", ...Array.from(found).sort((left, right) => left.localeCompare(right))];
  }, [results]);

  const filteredResults = useMemo(
    () => sortResults(matchFilters(results, searchText, statusFilter, genreFilter, watchlist), sortBy),
    [results, searchText, statusFilter, genreFilter, watchlist, sortBy],
  );

  const selectedWatchlistEntry = detail ? watchlist[detail.show.id] : null;
  const stats = useMemo(() => {
    if (!detail) return null;
    const aired = detail.episodes.filter((episode) => !!episode.airdate).length;
    const runtimeValues = detail.episodes
      .map((episode) => episode.runtime)
      .filter((runtime): runtime is number => typeof runtime === "number");
    const runtimeAverage = runtimeValues.length
      ? Math.round(runtimeValues.reduce((sum, value) => sum + value, 0) / runtimeValues.length)
      : detail.show.averageRuntime ?? detail.show.runtime;
    const nextEpisode = detail.episodes.find((episode) => {
      if (!episode.airdate) return false;
      return episode.airdate >= new Date().toISOString().slice(0, 10);
    });
    return {
      seasons: new Set(detail.episodes.map((episode) => episode.season)).size,
      episodeCount: detail.episodes.length,
      airedCount: aired,
      runtimeAverage,
      nextEpisode,
    };
  }, [detail]);

  function updateWatchlist(show: ShowSummary, changes: Partial<WatchlistEntry>) {
    setWatchlist((current) => {
      const previous = current[show.id];
      const nextEntry: WatchlistEntry = {
        show,
        status: previous?.status ?? "planned",
        rating: previous?.rating ?? null,
        notes: previous?.notes ?? "",
        updatedAt: new Date().toISOString(),
        ...changes,
      };
      return {
        ...current,
        [show.id]: nextEntry,
      };
    });
  }

  function removeFromWatchlist(showId: number) {
    setWatchlist((current) => {
      const next = { ...current };
      delete next[showId];
      return next;
    });
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(Object.values(watchlist), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nightshift-029-watchlist.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((text) => {
        const items = JSON.parse(text) as WatchlistEntry[];
        const next: Record<number, WatchlistEntry> = {};
        items.forEach((item) => {
          if (item?.show?.id) {
            next[item.show.id] = {
              show: item.show,
              status: WATCH_STATUSES.includes(item.status) ? item.status : "planned",
              rating: typeof item.rating === "number" ? item.rating : null,
              notes: typeof item.notes === "string" ? item.notes : "",
              updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
            };
          }
        });
        setWatchlist(next);
      })
      .catch(() => {
        setUpcomingError("Import failed. Choose a valid exported watchlist JSON file.");
      })
      .finally(() => {
        event.target.value = "";
      });
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Nightshift 029</p>
          <h1>ShowTracker</h1>
          <p className="hero-copy">
            Search TVMaze, triage what to watch next, and keep notes that survive refreshes.
          </p>
        </div>
        <form
          className="query-bar"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const nextQuery = String(formData.get("query") ?? "").trim();
            if (nextQuery) setQuery(nextQuery);
          }}
        >
          <label>
            Search TVMaze
            <input name="query" defaultValue={query} placeholder="Try: comedy, anime, detective..." />
          </label>
          <button type="submit">Run Search</button>
        </form>
      </header>

      <section className="toolbar">
        <label>
          Filter text
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        </label>
        <label>
          Genre
          <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre === "all" ? "All genres" : genre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Watch status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="all">All shows</option>
            <option value="untracked">Not in watchlist</option>
            {WATCH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
            <option value="score">Search score</option>
            <option value="name">Name</option>
            <option value="rating">TVMaze rating</option>
            <option value="premiered">Premiere date</option>
          </select>
        </label>
      </section>

      <main className="layout">
        <section className="panel stack">
          <div className="section-heading">
            <div>
              <h2>Search Results</h2>
              <p>{filteredResults.length} visible shows</p>
            </div>
          </div>

          {resultsLoading ? <div className="state-card">Loading shows from TVMaze…</div> : null}
          {resultsError ? <div className="state-card error">{resultsError}</div> : null}
          {!resultsLoading && !resultsError && filteredResults.length === 0 ? (
            <div className="state-card">No shows match the current search and filters.</div>
          ) : null}

          <div className="card-grid">
            {filteredResults.map(({ show }) => {
              const tracked = watchlist[show.id];
              return (
                <article
                  key={show.id}
                  className={`show-card ${selectedShowId === show.id ? "active" : ""}`}
                  onClick={() => setSelectedShowId(show.id)}
                >
                  <div className="poster-wrap">
                    {show.image ? <img src={show.image} alt={`${show.name} poster`} /> : <div className="poster-fallback">No Art</div>}
                    {tracked ? <span className="card-badge">{tracked.status}</span> : null}
                  </div>
                  <div className="show-copy">
                    <div className="title-row">
                      <h3>{show.name}</h3>
                      <span>{show.rating ? show.rating.toFixed(1) : "NR"}</span>
                    </div>
                    <p>{show.network ?? "Unknown network"}</p>
                    <p>{show.genres.length ? show.genres.join(" • ") : "Genre pending"}</p>
                    <p>{stripHtml(show.summary).slice(0, 110) || "No summary available."}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="stack">
          <section className="panel detail-panel">
            <div className="section-heading">
              <div>
                <h2>Details</h2>
                <p>Cast, stats, and watchlist notes</p>
              </div>
            </div>

            {detailLoading ? <div className="state-card">Loading show detail…</div> : null}
            {detailError ? <div className="state-card error">{detailError}</div> : null}

            {!detailLoading && !detailError && detail ? (
              <>
                <div className="detail-header">
                  {detail.show.image ? (
                    <img src={detail.show.image} alt={`${detail.show.name} artwork`} />
                  ) : (
                    <div className="detail-fallback">No Artwork</div>
                  )}
                  <div>
                    <h3>{detail.show.name}</h3>
                    <p>{stripHtml(detail.show.summary) || "No summary available."}</p>
                    <div className="meta-row">
                      <span>{detail.show.status}</span>
                      <span>{formatDate(detail.show.premiered)}</span>
                      <span>{detail.show.language ?? "Unknown language"}</span>
                    </div>
                  </div>
                </div>

                {stats ? (
                  <div className="stats-grid">
                    <div>
                      <strong>{stats.seasons}</strong>
                      <span>Seasons</span>
                    </div>
                    <div>
                      <strong>{stats.episodeCount}</strong>
                      <span>Episodes</span>
                    </div>
                    <div>
                      <strong>{stats.runtimeAverage ?? "?"}</strong>
                      <span>Avg runtime</span>
                    </div>
                    <div>
                      <strong>{stats.nextEpisode ? formatDate(stats.nextEpisode.airdate) : "None"}</strong>
                      <span>Next airing</span>
                    </div>
                  </div>
                ) : null}

                <div className="watchlist-editor">
                  <div className="section-heading compact">
                    <h3>Watchlist</h3>
                    {selectedWatchlistEntry ? (
                      <button type="button" className="ghost-button" onClick={() => removeFromWatchlist(detail.show.id)}>
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <label>
                    Status
                    <select
                      value={selectedWatchlistEntry?.status ?? "planned"}
                      onChange={(event) => updateWatchlist(detail.show, { status: event.target.value as WatchStatus })}
                    >
                      {WATCH_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Personal rating
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={selectedWatchlistEntry?.rating ?? ""}
                      onChange={(event) =>
                        updateWatchlist(detail.show, {
                          rating: event.target.value === "" ? null : Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Notes
                    <textarea
                      rows={4}
                      value={selectedWatchlistEntry?.notes ?? ""}
                      onChange={(event) => updateWatchlist(detail.show, { notes: event.target.value })}
                      placeholder="Why it matters, who recommended it, where you stopped..."
                    />
                  </label>
                </div>

                <div>
                  <div className="section-heading compact">
                    <h3>Cast</h3>
                    <p>{detail.cast.length} credited roles</p>
                  </div>
                  {detail.cast.length === 0 ? (
                    <div className="state-card">No cast information is available for this show.</div>
                  ) : (
                    <div className="cast-list">
                      {detail.cast.slice(0, 8).map((credit) => (
                        <div key={`${credit.person.id}-${credit.character.id}`} className="cast-card">
                          <strong>{credit.person.name}</strong>
                          <span>as {credit.character.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}

            {!detailLoading && !detailError && !detail ? (
              <div className="state-card">Select a show to inspect its full detail panel.</div>
            ) : null}
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Upcoming Board</h2>
                <p>Next episodes from your watchlist</p>
              </div>
              <div className="button-row">
                <button type="button" onClick={handleExport} disabled={Object.keys(watchlist).length === 0}>
                  Export JSON
                </button>
                <button type="button" onClick={handleImportClick}>
                  Import JSON
                </button>
                <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImport} />
              </div>
            </div>

            {upcomingLoading ? <div className="state-card">Refreshing upcoming episodes…</div> : null}
            {upcomingError ? <div className="state-card error">{upcomingError}</div> : null}
            {!upcomingLoading && !upcomingError && upcomingEpisodes.length === 0 ? (
              <div className="state-card">
                {Object.keys(watchlist).length === 0
                  ? "Your watchlist is empty. Add a show from the detail panel."
                  : "No upcoming episodes were found for your tracked shows."}
              </div>
            ) : null}
            <div className="upcoming-list">
              {upcomingEpisodes.map((item) => (
                <article key={`${item.showId}-${item.airdate}`} className="upcoming-card">
                  <p>{formatDate(item.airdate)}</p>
                  <h3>{item.showName}</h3>
                  <p>
                    S{String(item.season).padStart(2, "0")}E{String(item.number).padStart(2, "0")} • {item.episodeName}
                  </p>
                  <span>{item.status}</span>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
