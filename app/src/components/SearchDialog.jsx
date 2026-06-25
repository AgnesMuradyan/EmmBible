import { useEffect, useRef } from 'react';
import { Icon } from './Icon.jsx';

function highlightText(text, query) {
  const words = query.trim().split(/\s+/).filter((word) => word.length > 1);
  if (!words.length) return text;
  const expression = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return text.split(expression).map((part, index) => (
    words.some((word) => part.toLocaleLowerCase('hy-AM') === word.toLocaleLowerCase('hy-AM'))
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : part
  ));
}

export function SearchDialog({
  open,
  query,
  onQueryChange,
  scope,
  onScopeChange,
  status,
  progress,
  results,
  onSelect,
  onClose,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="search-dialog" role="dialog" aria-modal="true" aria-label="Որոնել Աստվածաշնչում">
        <div className="search-input-row">
          <Icon name="search" size={23} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="..."
          />
          <button className="icon-button" type="button" onClick={onClose} aria-label="Փակել">
            <Icon name="close" />
          </button>
        </div>

        <div className="search-options">
          <div className="segmented-control">
            <button className={scope === 'all' ? 'active' : ''} type="button" onClick={() => onScopeChange('all')}>
              Ամբողջ Աստվածաշունչ
            </button>
            <button className={scope === 'book' ? 'active' : ''} type="button" onClick={() => onScopeChange('book')}>
              Այս գիրքը
            </button>
          </div>
        </div>

        {progress && progress.completed < progress.total && (
          <div className="index-progress">
            <div><span style={{ width: `${(progress.completed / progress.total) * 100}%` }} /></div>
            <p>Ինդեքսավորվում է՝ {progress.completed}/{progress.total} · {progress.bookName}</p>
          </div>
        )}

        <div className="search-summary" aria-live="polite">
          <span>{status}</span>
        </div>

        <div className="search-result-list">
          {query.trim().length < 2 ? (
            <div className="search-hint">
              <span className="search-hint-icon"><Icon name="quote" size={27} /></span>
              <h3>Գտիր ցանկացած հատված</h3>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <Icon name="search" size={32} />
              <p>{status}</p>
            </div>
          ) : results.map((result) => (
            <button className="search-result" key={`${result.bookNumber}-${result.chapter}-${result.verse}`} type="button" onClick={() => onSelect(result)}>
              <span className="result-reference">{result.bookName} {result.chapter}:{result.verse}</span>
              <span className="result-preview">{highlightText(result.text, query)}</span>
              <Icon name="chevronRight" size={18} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
