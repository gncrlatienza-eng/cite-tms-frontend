import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function SearchBar({ initialQuery = "", autoFocus = false }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`);
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = (q) => {
    const trimmed = q.trim();
    setShowSuggestions(false);
    navigate(trimmed ? `/papers?q=${encodeURIComponent(trimmed)}` : "/papers");
  };

  const handleSubmit = (e) => { e.preventDefault(); doSearch(query); };

  const handleKeyDown = (e) => {
    if (!showSuggestions || !suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); setQuery(suggestions[activeIdx]); doSearch(suggestions[activeIdx]); }
    else if (e.key === "Escape") setShowSuggestions(false);
  };

  return (
    <>
      <style>{`
        .sb-wrap { position: relative; width: 100%; }
        .sb-form {
          display: flex; align-items: center; width: 100%;
          border: 1.5px solid #e5e7eb; border-radius: 50px;
          background: #fff;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
          padding: 5px 5px 5px 20px; gap: 10px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sb-form:focus-within { border-color: #9b0000; box-shadow: 0 4px 24px rgba(155,0,0,0.1), 0 0 0 3px rgba(155,0,0,0.07); }
        .sb-icon { color: #9ca3af; display: flex; flex-shrink: 0; pointer-events: none; transition: color 0.2s; }
        .sb-form:focus-within .sb-icon { color: #9b0000; }
        .sb-input {
          flex: 1; border: none; outline: none; font-size: 15px;
          font-family: 'DM Sans', system-ui, sans-serif; color: #111827;
          background: transparent; padding: 9px 0; min-width: 0;
        }
        .sb-input::placeholder { color: #9ca3af; }
        .sb-input::-webkit-search-cancel-button { display: none; }
        .sb-clear {
          background: none; border: none; cursor: pointer; color: #9ca3af;
          padding: 5px; display: flex; align-items: center; justify-content: center;
          border-radius: 50%; transition: color 0.15s, background 0.15s; flex-shrink: 0;
        }
        .sb-clear:hover { color: #374151; background: #f3f4f6; }
        .sb-submit {
          background: #9b0000; color: #fff; border: none; border-radius: 50px;
          padding: 10px 24px; font-size: 13.5px; font-weight: 600;
          font-family: 'DM Sans', system-ui, sans-serif; cursor: pointer;
          flex-shrink: 0; transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          letter-spacing: 0.1px; white-space: nowrap;
        }
        .sb-submit:hover { background: #7f1d1d; box-shadow: 0 2px 10px rgba(155,0,0,0.25); }
        .sb-submit:active { transform: scale(0.96); }
        .sb-dropdown {
          position: absolute; top: calc(100% + 8px); left: 0; right: 0;
          background: #fff; border: 1.5px solid #e5e7eb; border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.10); z-index: 100;
          overflow: hidden; animation: sb-fade 0.15s ease;
        }
        @keyframes sb-fade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .sb-suggestion {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 18px; cursor: pointer; font-size: 14px;
          color: #374151; font-family: 'DM Sans', system-ui, sans-serif;
          transition: background 0.1s;
        }
        .sb-suggestion:hover, .sb-suggestion.active { background: #fef2f2; color: #9b0000; }
        .sb-suggestion svg { flex-shrink: 0; opacity: 0.5; }
        .sb-suggestion.active svg { opacity: 1; }
        .sb-suggestion-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sb-loading { padding: 12px 18px; font-size: 13px; color: #9ca3af; font-family: 'DM Sans', system-ui, sans-serif; }
      `}</style>

      <div className="sb-wrap" ref={containerRef}>
        <form className="sb-form" onSubmit={handleSubmit} role="search">
          <span className="sb-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>

          <input
            className="sb-input" type="search" name="q"
            placeholder="Search papers, authors, topics…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
            onFocus={() => suggestions.length && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off" autoCorrect="off" spellCheck={false} autoFocus={autoFocus}
          />

          {query && (
            <button type="button" className="sb-clear" onClick={() => { setQuery(""); setSuggestions([]); }} aria-label="Clear search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}

          <button type="submit" className="sb-submit">Search</button>
        </form>

        {showSuggestions && (
          <div className="sb-dropdown" role="listbox">
            {loading ? (
              <div className="sb-loading">Finding related topics…</div>
            ) : suggestions.map((s, i) => (
              <div
                key={s} role="option" aria-selected={i === activeIdx}
                className={`sb-suggestion${i === activeIdx ? " active" : ""}`}
                onMouseDown={() => { setQuery(s); doSearch(s); }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <span className="sb-suggestion-text">{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}