import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BOOKS, DEFAULT_BOOK_NUMBER } from './data/books.js';
import { fetchBook } from './lib/bibleParser.js';
import {
  buildSearchIndex,
  clearCachedIndex,
  getCachedIndex,
  searchIndex as runSearch,
} from './lib/searchIndex.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { Header } from './components/Header.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { ReaderToolbar } from './components/ReaderToolbar.jsx';
import { Reader } from './components/Reader.jsx';
import { SearchDialog } from './components/SearchDialog.jsx';
import { Drawer } from './components/Drawer.jsx';
import { SettingsPanel } from './components/SettingsPanel.jsx';
import { Icon } from './components/Icon.jsx';

function readInitialLocation() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hashBook = Number(hash.get('book'));
  const hashChapter = hash.get('chapter');
  const hashVerse = hash.get('verse');

  if (hashBook >= 1 && hashBook <= 66) {
    return {
      book: hashBook,
      chapter: hashChapter || '1',
      verse: hashVerse || null,
    };
  }

  return { book: DEFAULT_BOOK_NUMBER, chapter: '1', verse: null };
}

function updateHash(book, chapter, verse = null) {
  const params = new URLSearchParams({ book: String(book), chapter: String(chapter) });
  if (verse) params.set('verse', String(verse));
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${params}`);
}

export default function App() {
  const initialLocation = useRef(readInitialLocation()).current;
  const [bookNumber, setBookNumber] = useState(initialLocation.book);
  const [chapterNumber, setChapterNumber] = useState(initialLocation.chapter);
  const [pendingVerse, setPendingVerse] = useState(initialLocation.verse);
  const [bookData, setBookData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [theme, setTheme] = useLocalStorage('bible:theme', 'dark');
  const [fontSize, setFontSize] = useLocalStorage('bible:font-size', 22);
  const [lineHeight, setLineHeight] = useLocalStorage('bible:line-height', 1.95);
  const [, setLastLocation] = useLocalStorage('bible:last-location', initialLocation);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedReference, setSelectedReference] = useState(null);
  const [pendingReferenceJump, setPendingReferenceJump] = useState(null);
  const [toast, setToast] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState('book');
  const [searchData, setSearchData] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('Սկսիր գրել՝ որոնելու համար։');
  const [indexProgress, setIndexProgress] = useState(null);
  const indexPromiseRef = useRef(null);
  const indexAbortRef = useRef(null);

  const currentChapter = useMemo(
    () => bookData?.chapters.find((chapter) => String(chapter.number) === String(chapterNumber)) || null,
    [bookData, chapterNumber],
  );

  const currentChapterIndex = useMemo(
    () => bookData?.chapters.findIndex((chapter) => String(chapter.number) === String(chapterNumber)) ?? -1,
    [bookData, chapterNumber],
  );

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(''), 2200);
  }, []);

  const navigate = useCallback((nextBook, nextChapter = 1, verse = null) => {
    setBookNumber(Number(nextBook));
    setChapterNumber(String(nextChapter));
    setPendingVerse(verse ? String(verse) : null);
    setSelectedReference(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleHashNavigation = () => {
      const location = readInitialLocation();
      setBookNumber(location.book);
      setChapterNumber(String(location.chapter));
      setPendingVerse(location.verse ? String(location.verse) : null);
      setSelectedReference(null);
    };

    window.addEventListener('hashchange', handleHashNavigation);
    return () => window.removeEventListener('hashchange', handleHashNavigation);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#171819' : theme === 'light' ? '#f4f5f6' : '#f4ede2',
    );
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setBookData(null);

    fetchBook(bookNumber, BOOKS[bookNumber - 1]?.name || `Book ${bookNumber}`, controller.signal)
      .then((parsed) => {
        setBookData(parsed);
        const requestedExists = parsed.chapters.some(
          (chapter) => String(chapter.number) === String(chapterNumber),
        );
        if (!requestedExists && parsed.chapters[0]) {
          setChapterNumber(String(parsed.chapters[0].number));
        }
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') {
          setError(`Book${bookNumber}.html ֆայլը չգտնվեց կամ հնարավոր չեղավ կարդալ։`);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [bookNumber]);

  useEffect(() => {
    if (!bookData || !currentChapter) return;
    updateHash(bookNumber, chapterNumber, pendingVerse);
    setLastLocation({ book: bookNumber, chapter: chapterNumber });
  }, [bookData, currentChapter, bookNumber, chapterNumber, pendingVerse, setLastLocation]);

  useEffect(() => {
    if (!pendingVerse || !currentChapter) return undefined;
    let cancelled = false;
    const timeouts = [];

    const alignVerse = (behavior = 'auto') => {
      if (cancelled) return;
      const verse = document.getElementById(`verse-${pendingVerse}`);
      if (verse) {
        verse.scrollIntoView({ behavior, block: 'center' });
        verse.classList.add('verse-jump-highlight');
      }
    };

    const beginJump = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      if (cancelled) return;

      alignVerse(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
      timeouts.push(window.setTimeout(() => alignVerse('auto'), 350));
      timeouts.push(window.setTimeout(() => alignVerse('auto'), 900));
      timeouts.push(window.setTimeout(() => {
        document.getElementById(`verse-${pendingVerse}`)?.classList.remove('verse-jump-highlight');
      }, 3600));
    };

    const startTimeout = window.setTimeout(beginJump, 80);
    timeouts.push(startTimeout);
    return () => {
      cancelled = true;
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [pendingVerse, currentChapter]);

  useEffect(() => {
    const handleScroll = () => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadingProgress(documentHeight > 0 ? Math.min(100, (window.scrollY / documentHeight) * 100) : 0);
      setShowScrollTop(window.scrollY > 700);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [currentChapter]);

  const ensureSearchIndex = useCallback(async (force = false) => {
    if (searchData && !force) return searchData;
    if (indexPromiseRef.current && !force) return indexPromiseRef.current;

    if (force) {
      indexAbortRef.current?.abort();
      indexPromiseRef.current = null;
      setSearchData(null);
      await clearCachedIndex();
    }

    const controller = new AbortController();
    indexAbortRef.current = controller;

    const promise = (async () => {
      if (!force) {
        const cached = await getCachedIndex();
        if (cached?.length) {
          setSearchData(cached);
          return cached;
        }
      }

      setSearchStatus('Պատրաստվում է ամբողջ Աստվածաշնչի որոնումը...');
      setIndexProgress({ completed: 0, total: 66, bookName: '' });
      const built = await buildSearchIndex({
        signal: controller.signal,
        onProgress: setIndexProgress,
      });
      setSearchData(built);
      setIndexProgress(null);
      return built;
    })();

    indexPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      if (indexPromiseRef.current === promise) indexPromiseRef.current = null;
    }
  }, [searchData]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    ensureSearchIndex().catch((indexError) => {
      if (indexError.name !== 'AbortError') setSearchStatus('Չհաջողվեց պատրաստել որոնումը։');
    });
  }, [ensureSearchIndex]);

  const changeSearchScope = useCallback((scope) => {
    setSearchScope(scope);
    ensureSearchIndex().catch((indexError) => {
      if (indexError.name !== 'AbortError') setSearchStatus('Չհաջողվեց պատրաստել որոնումը։');
    });
  }, [ensureSearchIndex]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      if (!searchData) {
        setSearchStatus('Որոնման ինդեքսը դեռ պատրաստվում է...');
        return;
      }

      const { total, items } = runSearch(
        searchData,
        searchQuery,
        searchScope === 'book' ? bookNumber : null,
      );
      setSearchResults(items);
      setSearchStatus(total ? `Գտնվեց ${total} արդյունք` : 'Արդյունք չգտնվեց։');
    }, 160);

    return () => window.clearTimeout(timeout);
  }, [searchQuery, searchScope, searchData, bookNumber]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target?.isContentEditable;

      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        openSearch();
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setSidebarOpen(false);
        setReferencesOpen(false);
        setSettingsOpen(false);
      }
      if (!isTyping && event.altKey && event.key === 'ArrowLeft' && currentChapterIndex > 0) {
        navigate(bookNumber, bookData.chapters[currentChapterIndex - 1].number);
      }
      if (!isTyping && event.altKey && event.key === 'ArrowRight' && currentChapterIndex < (bookData?.chapters.length || 0) - 1) {
        navigate(bookNumber, bookData.chapters[currentChapterIndex + 1].number);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearch, currentChapterIndex, navigate, bookNumber, bookData]);

  const copyVerse = async (verse) => {
    const text = `${bookData.name} ${currentChapter.number}:${verse.number}\n${verse.text}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Համարը պատճենվեց');
    } catch {
      showToast('Չհաջողվեց պատճենել');
    }
  };

  const shareVerse = async (verse) => {
    const title = `${bookData.name} ${currentChapter.number}:${verse.number}`;
    updateHash(bookNumber, currentChapter.number, verse.number);
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch (shareError) {
        if (shareError.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('Համարի հղումը պատճենվեց');
    } catch {
      showToast('Չհաջողվեց պատճենել հղումը');
    }
  };

  useEffect(() => {
    if (!pendingReferenceJump || referencesOpen) return undefined;
    const timeout = window.setTimeout(() => {
      const reference = pendingReferenceJump;
      const refs = [...document.querySelectorAll('.xref')];
      const target = refs.find((ref) => {
        const sameReference = ref.dataset.refId === reference.id;
        const sameVerse = ref.closest('.verse-row')?.dataset.verse === String(reference.verse);
        return sameReference && sameVerse;
      }) || refs.find((ref) => ref.dataset.refId === reference.id)
        || refs.find((ref) => (
          ref.closest('.verse-row')?.dataset.verse === String(reference.verse)
          && ref.textContent.trim() === reference.mark
        ));
      if (!target) {
        setPendingReferenceJump(null);
        return;
      }
      const verseRow = target.closest('.verse-row');
      (verseRow || target).scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('xref-flash');
      window.setTimeout(() => {
        target.classList.remove('xref-flash');
        setPendingReferenceJump(null);
      }, 2200);
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [pendingReferenceJump, referencesOpen]);

  const goToReference = (reference) => {
    setPendingReferenceJump(reference);
    setReferencesOpen(false);
  };

  const previousChapter = () => {
    if (currentChapterIndex > 0) {
      navigate(bookNumber, bookData.chapters[currentChapterIndex - 1].number);
    }
  };

  const nextChapter = () => {
    if (currentChapterIndex < bookData.chapters.length - 1) {
      navigate(bookNumber, bookData.chapters[currentChapterIndex + 1].number);
    }
  };

  const references = currentChapter?.references || [];

  return (
    <div className="app-shell">
      <div className="reading-progress" aria-hidden="true"><span style={{ width: `${readingProgress}%` }} /></div>
      <Header
        theme={theme}
        chapterKey={`${bookNumber}-${chapterNumber}`}
        onThemeChange={setTheme}
        onMenu={() => setSidebarOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        bookNumber={bookNumber}
        chapterNumber={chapterNumber}
        chapters={bookData?.chapters || []}
        onNavigate={navigate}
      />

      <main className="main-content">
        <ReaderToolbar
          onSearch={openSearch}
        />

        <Reader
          bookName={bookData?.name || BOOKS[bookNumber - 1]?.name || ''}
          chapter={currentChapter}
          loading={loading}
          error={error}
          fontSize={fontSize}
          lineHeight={lineHeight}
          onCopy={copyVerse}
          onShare={shareVerse}
          onReference={(reference) => {
            setSelectedReference(reference);
            setReferencesOpen(true);
          }}
          onPrevious={previousChapter}
          onNext={nextChapter}
          previousChapterNumber={currentChapterIndex > 0 ? bookData.chapters[currentChapterIndex - 1].number : null}
          nextChapterNumber={currentChapterIndex >= 0 && currentChapterIndex < (bookData?.chapters.length || 0) - 1
            ? bookData.chapters[currentChapterIndex + 1].number
            : null}
          hasPrevious={currentChapterIndex > 0}
          hasNext={currentChapterIndex >= 0 && currentChapterIndex < (bookData?.chapters.length || 0) - 1}
        />
      </main>

      <footer className="site-footer">
        <span aria-hidden="true">©</span>
        <span>2026 Life Publishers International</span>
      </footer>

      <button
        className={`scroll-to-top${showScrollTop ? ' visible' : ''}`}
        type="button"
        title="Վերադառնալ վերև"
        aria-label="Վերադառնալ էջի վերև"
        aria-hidden={!showScrollTop}
        tabIndex={showScrollTop ? 0 : -1}
        onClick={() => window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        })}
      >
        <Icon name="arrowUp" size={19} />
      </button>

      <SearchDialog
        open={searchOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        scope={searchScope}
        onScopeChange={changeSearchScope}
        status={searchStatus}
        progress={indexProgress}
        results={searchResults}
        onSelect={(result) => {
          setSearchOpen(false);
          navigate(result.bookNumber, result.chapter, result.verse);
        }}
        onClose={() => setSearchOpen(false)}
      />

      <Drawer open={referencesOpen} title={`Հղումներ · Գլուխ ${chapterNumber}`} onClose={() => setReferencesOpen(false)}>
        {selectedReference && (
          <div className="selected-reference">
            <span>{selectedReference.mark}</span>
            <div>
              <small>Համար {selectedReference.verse}</small>
              <p>{selectedReference.note}</p>
            </div>
          </div>
        )}
        {references.length === 0 ? (
          <div className="empty-state"><Icon name="list" size={32} /><p>Այս գլխում հղումներ չկան։</p></div>
        ) : (
          <div className="reference-list">
            {references.map((reference, index) => (
              <button
                key={`${reference.id}-${index}`}
                type="button"
                data-ref-id={reference.id}
                data-verse={reference.verse}
                onMouseDown={(event) => {
                  event.preventDefault();
                  goToReference(reference);
                }}
                onClick={() => goToReference(reference)}
              >
                <span>{reference.mark}</span>
                <div><small>Համար {reference.verse}</small><p>{reference.note}</p></div>
              </button>
            ))}
          </div>
        )}
      </Drawer>

      <Drawer open={settingsOpen} title="Ընթերցման տեսք" onClose={() => setSettingsOpen(false)}>
        <SettingsPanel
          theme={theme}
          onThemeChange={setTheme}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          lineHeight={lineHeight}
          onLineHeightChange={setLineHeight}
        />
      </Drawer>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
