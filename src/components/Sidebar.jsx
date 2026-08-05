import { useMemo, useState } from 'react';
import { BOOKS } from '../data/books.js';
import { Icon } from './Icon.jsx';

export function Sidebar({
  open,
  onClose,
  bookNumber,
  chapterNumber,
  chapters,
  onNavigate,
}) {
  const [tab, setTab] = useState('books');
  const [bookFilter, setBookFilter] = useState('');

  const filteredBooks = useMemo(() => {
    const query = bookFilter.trim().toLocaleLowerCase('hy-AM');
    if (!query) return BOOKS;
    return BOOKS.filter((book) => `${book.number} ${book.name}`.toLocaleLowerCase('hy-AM').includes(query));
  }, [bookFilter]);

  const oldTestament = filteredBooks.filter((book) => book.number <= 39);
  const newTestament = filteredBooks.filter((book) => book.number >= 40);

  const renderBookGroup = (title, books, testament) => (
    books.length > 0 && (
      <section className={`book-group ${testament}-testament`} key={title}>
        <div className="testament-heading">
          <span className="testament-mark" aria-hidden="true" />
          <h3>{title}</h3>
        </div>
        <div className="book-list">
          {books.map((book) => (
            <button
              className={`book-item ${book.number === bookNumber ? 'active' : ''}`}
              key={book.number}
              type="button"
              onClick={() => {
                onNavigate(book.number, 1);
                setTab('chapters');
              }}
            >
              <span className="book-index">{book.number}</span>
              <span>{book.name}</span>
            </button>
          ))}
        </div>
      </section>
    )
  );

  return (
    <>
      <button
        className={`sidebar-backdrop ${open ? 'show' : ''}`}
        type="button"
        aria-label="Փակել ցանկը"
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Աստվածաշնչի նավիգացիա">
        <div className="sidebar-mobile-head">
          <button className="icon-button" type="button" onClick={onClose} aria-label="Փակել">
            <Icon name="close" />
          </button>
        </div>

        <div className="sidebar-tabs" role="tablist" aria-label="Նավիգացիայի բաժիններ">
          <button className={tab === 'books' ? 'active' : ''} type="button" onClick={() => setTab('books')}>
            Գրքեր
          </button>
          <button className={tab === 'chapters' ? 'active' : ''} type="button" onClick={() => setTab('chapters')}>
            Գլուխներ
          </button>
        </div>

        <div className="sidebar-scroll">
          {tab === 'books' && (
            <>
              <label className="sidebar-search">
                <Icon name="search" size={17} />
                <input
                  value={bookFilter}
                  onChange={(event) => setBookFilter(event.target.value)}
                  placeholder="Գտնել գիրքը..."
                  type="search"
                />
              </label>
              {renderBookGroup('Հին Կտակարան', oldTestament, 'old')}
              {renderBookGroup('Նոր Կտակարան', newTestament, 'new')}
            </>
          )}

          {tab === 'chapters' && (
            <section className="chapter-section">
              <h3>{BOOKS[bookNumber - 1]?.name}</h3>
              <div className="chapter-grid">
                {chapters.map((chapter) => (
                  <button
                    className={String(chapter.number) === String(chapterNumber) ? 'active' : ''}
                    key={chapter.number}
                    type="button"
                    onClick={() => {
                      onNavigate(bookNumber, chapter.number);
                      onClose();
                    }}
                  >
                    {chapter.number}
                  </button>
                ))}
              </div>
            </section>
          )}

        </div>
      </aside>
    </>
  );
}
