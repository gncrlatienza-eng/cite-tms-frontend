import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar({ initialQuery = "", autoFocus = false }) {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/papers?q=${encodeURIComponent(q)}` : "/papers");
  };

  return (
    <>
      <style>{`
        .sb-form {
          display: flex;
          align-items: center;
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 50px;
          background: #fff;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
          padding: 5px 5px 5px 20px;
          gap: 10px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sb-form:focus-within {
          border-color: #9b0000;
          box-shadow: 0 4px 24px rgba(155,0,0,0.1), 0 0 0 3px rgba(155,0,0,0.07);
        }
        .sb-icon {
          color: #9ca3af;
          display: flex;
          flex-shrink: 0;
          pointer-events: none;
          transition: color 0.2s;
        }
        .sb-form:focus-within .sb-icon { color: #9b0000; }
        .sb-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15px;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #111827;
          background: transparent;
          padding: 9px 0;
          min-width: 0;
        }
        .sb-input::placeholder { color: #9ca3af; }
        .sb-input::-webkit-search-cancel-button { display: none; }
        .sb-clear {
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .sb-clear:hover { color: #374151; background: #f3f4f6; }
        .sb-submit {
          background: #9b0000;
          color: #fff;
          border: none;
          border-radius: 50px;
          padding: 10px 24px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'DM Sans', system-ui, sans-serif;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          letter-spacing: 0.1px;
          white-space: nowrap;
        }
        .sb-submit:hover { background: #7f1d1d; box-shadow: 0 2px 10px rgba(155,0,0,0.25); }
        .sb-submit:active { transform: scale(0.96); }
      `}</style>

      <form className="sb-form" onSubmit={handleSubmit} role="search">
        <span className="sb-icon">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>

        <input
          className="sb-input"
          type="search"
          name="q"
          placeholder="Search papers, authors, topics…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
        />

        {query && (
          <button
            type="button"
            className="sb-clear"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}

        <button type="submit" className="sb-submit">Search</button>
      </form>
    </>
  );
}
