# Հայերեն Աստվածաշունչ — React reader

A Vite + React reader for the existing `Book1.html` … `Book66.html` files. The source book files are not converted: the app reads chapter numbers from `<strong>`, verse numbers from `<sup>`, and cross-references from `.xref[data-note]`.

## Put in your 66 books

Copy all files into:

```text
public/books/Book1.html
public/books/Book2.html
...
public/books/Book66.html
```

`Book30.html` is included as the working sample supplied with this project. The demo starts from Book 30 so it opens immediately. After all files are copied, change `DEFAULT_BOOK_NUMBER` in `src/data/books.js` from `30` to `1` if desired.

The loader also checks `/BookN.html`, so the book files can alternatively be placed directly in `public/`.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Included functionality

- All 66 books and chapter navigation
- Full-Bible or current-book search
- Search index cached in IndexedDB
- Cross-reference hover tooltip and reference drawer
- Bookmarks saved in localStorage
- Copy verse
- Persistent theme, font size, line height, and last-read position
- Deep links: `#book=30&chapter=3&verse=2`
- Previous/next chapter navigation
- Keyboard shortcuts: `/` opens search, `Esc` closes dialogs, `Alt + ←/→` changes chapter
- Responsive mobile sidebar and drawers
- Print layout
