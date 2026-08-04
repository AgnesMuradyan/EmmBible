import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';

const COPY_BOOK_NAMES = {
  'Ելք': 'Ելից',
};

function cleanCopiedText(fragment) {
  fragment.querySelectorAll('.xref, .verse-actions').forEach((node) => node.remove());
  return fragment.textContent.replace(/\s+/g, ' ').trim();
}

function formatCopyTitle(bookName, chapterNumber, selectedRows) {
  const copyBookName = COPY_BOOK_NAMES[bookName] || bookName;
  const firstVerse = selectedRows[0]?.dataset.verse;
  const lastVerse = selectedRows[selectedRows.length - 1]?.dataset.verse;

  if (!firstVerse) return `Գիրք ${copyBookName} ${chapterNumber}`;
  const verseRange = firstVerse === lastVerse ? firstVerse : `${firstVerse}-${lastVerse}`;
  return `${copyBookName} ${chapterNumber}:${verseRange}`;
}

export function Reader({
  bookName,
  chapter,
  loading,
  error,
  fontSize,
  lineHeight,
  onCopy,
  onReference,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}) {
  const [hoverReference, setHoverReference] = useState(null);

  const showReferenceTip = (ref) => {
    const rect = ref.getBoundingClientRect();
    const isCompact = window.matchMedia('(max-width: 720px), (hover: none), (pointer: coarse)').matches;
    setHoverReference({
      mark: ref.textContent.trim(),
      note: ref.dataset.note || '',
      left: isCompact ? window.innerWidth / 2 : Math.min(Math.max(rect.left + rect.width / 2, 160), window.innerWidth - 160),
      top: rect.top > 110 ? rect.top - 12 : rect.bottom + 12,
      placement: rect.top > 110 ? 'top' : 'bottom',
    });
  };

  useEffect(() => {
    if (!hoverReference) return undefined;
    const clearReference = () => setHoverReference(null);
    window.addEventListener('scroll', clearReference, { passive: true });
    return () => window.removeEventListener('scroll', clearReference);
  }, [hoverReference]);

  const handleMouseOver = (event) => {
    const ref = event.target.closest('.xref');
    if (!ref || !event.currentTarget.contains(ref)) return;
    showReferenceTip(ref);
  };

  const handleMouseOut = (event) => {
    const ref = event.target.closest('.xref');
    if (!ref) return;
    if (event.relatedTarget && ref.contains(event.relatedTarget)) return;
    setHoverReference(null);
  };

  const handleClick = (event) => {
    const ref = event.target.closest('.xref');
    if (!ref || !event.currentTarget.contains(ref)) return;
    event.preventDefault();
    const shouldShowInline = window.matchMedia('(max-width: 720px), (hover: none), (pointer: coarse)').matches;
    if (shouldShowInline) {
      showReferenceTip(ref);
      return;
    }
    const verseRow = ref.closest('.verse-row');
    onReference({
      id: ref.dataset.refId || '',
      mark: ref.textContent.trim(),
      note: ref.dataset.note || '',
      verse: verseRow?.dataset.verse || '',
    });
  };

  const handleSelectionCopy = (event) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!event.currentTarget.contains(range.commonAncestorContainer)) return;

    const selectedRows = [...event.currentTarget.querySelectorAll('.verse-row')]
      .filter((row) => range.intersectsNode(row));
    if (selectedRows.length === 0) return;

    const selectedText = cleanCopiedText(range.cloneContents());
    if (!selectedText) return;

    const title = formatCopyTitle(bookName, chapter.number, selectedRows);
    event.preventDefault();
    event.clipboardData.setData('text/plain', `${title}\n${selectedText}`);
  };

  if (loading) {
    return (
      <article className="reader-card loading-card" aria-live="polite">
        <div className="skeleton skeleton-title" />
        {Array.from({ length: 8 }, (_, index) => <div className="skeleton" key={index} />)}
      </article>
    );
  }

  if (error) {
    return (
      <article className="reader-card error-card">
        <div className="error-symbol">!</div>
        <h2>Չհաջողվեց բացել գիրքը</h2>
        <p>{error}</p>
        <small>Տեղադրիր ֆայլը <code>public/books/BookN.html</code> հասցեում։</small>
      </article>
    );
  }

  if (!chapter) return null;

  return (
    <article className="reader-card">
      <header className="chapter-header">
        <h1>{bookName}</h1>
        <p>Գլուխ {chapter.number}</p>
      </header>

      <div
        className="chapter-content"
        style={{ '--reader-font-size': `${fontSize}px`, '--reader-line-height': lineHeight }}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onMouseLeave={() => setHoverReference(null)}
        onClick={handleClick}
        onCopy={handleSelectionCopy}
      >
        {chapter.preludeHtml && (
          <div className="chapter-prelude" dangerouslySetInnerHTML={{ __html: chapter.preludeHtml }} />
        )}

        {chapter.verses.map((verse) => {
          return (
            <section className="verse-row" id={`verse-${verse.number}`} data-verse={verse.number} key={verse.number}>
              <button
                className="verse-number"
                type="button"
                title={`Պատճենել ${chapter.number}:${verse.number}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onCopy(verse);
                }}
              >
                {verse.number}
              </button>
              <div className="verse-body" dangerouslySetInnerHTML={{ __html: verse.html }} />
              <div className="verse-actions">
                <button
                  type="button"
                  title="Պատճենել համարը"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCopy(verse);
                  }}
                >
                  <Icon name="copy" size={17} />
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <footer className="chapter-navigation">
        <button type="button" onClick={onPrevious} disabled={!hasPrevious}>
          <Icon name="chevronLeft" />
          <span>Նախորդ գլուխ</span>
        </button>
        <div>
          <strong>{bookName}</strong>
          <span>Գլուխ {chapter.number}</span>
        </div>
        <button type="button" onClick={onNext} disabled={!hasNext}>
          <span>Հաջորդ գլուխ</span>
          <Icon name="chevronRight" />
        </button>
      </footer>

      {hoverReference?.note && (
        <div
          className={`xref-tooltip ${hoverReference.placement}`}
          style={{
            '--reader-font-size': `${fontSize}px`,
            '--reader-line-height': lineHeight,
            left: hoverReference.left,
            top: hoverReference.top,
          }}
          role="tooltip"
        >
          <strong>{hoverReference.mark}</strong>
          <span>{hoverReference.note}</span>
        </div>
      )}
    </article>
  );
}
