import { BOOKS } from '../data/books.js';
import { fetchBook, normalizeText } from './bibleParser.js';

const DB_NAME = 'armenian-bible-reader';
const STORE_NAME = 'search-index';
const CACHE_KEY = 'v1';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedIndex() {
  try {
    const database = await openDatabase();
    if (!database) return null;
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(CACHE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function saveCachedIndex(index) {
  try {
    const database = await openDatabase();
    if (!database) return;
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(index, CACHE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // Search still works in memory if IndexedDB is blocked.
  }
}

export async function clearCachedIndex() {
  try {
    const database = await openDatabase();
    if (!database) return;
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(CACHE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // No-op.
  }
}

export async function buildSearchIndex({ onProgress, signal }) {
  const index = [];
  const queue = [...BOOKS];
  let completed = 0;

  const worker = async () => {
    while (queue.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const book = queue.shift();
      try {
        const parsed = await fetchBook(book.number, book.name, signal);
        parsed.chapters.forEach((chapter) => {
          chapter.verses.forEach((verse) => {
            index.push({
              bookNumber: book.number,
              bookName: parsed.name,
              chapter: chapter.number,
              verse: verse.number,
              text: verse.text,
              searchable: normalizeText(`${parsed.name} ${chapter.number} ${verse.number} ${verse.text}`),
            });
          });
        });
      } catch (error) {
        if (error.name === 'AbortError') throw error;
      } finally {
        completed += 1;
        onProgress?.({ completed, total: BOOKS.length, bookName: book.name });
      }
    }
  };

  await Promise.all(Array.from({ length: 4 }, worker));
  index.sort((a, b) => a.bookNumber - b.bookNumber
    || Number(a.chapter) - Number(b.chapter)
    || Number(a.verse) - Number(b.verse));
  await saveCachedIndex(index);
  return index;
}

export function searchIndex(index, query, scopeBookNumber = null) {
  const normalizedQuery = normalizeText(query);
  if (normalizedQuery.length < 2) return { total: 0, items: [] };

  const words = normalizedQuery.split(' ').filter(Boolean);
  const matched = [];
  let total = 0;

  for (const item of index) {
    if (scopeBookNumber && item.bookNumber !== scopeBookNumber) continue;
    if (!words.every((word) => item.searchable.includes(word))) continue;
    total += 1;
    matched.push(item);
  }

  return { total, items: matched };
}
