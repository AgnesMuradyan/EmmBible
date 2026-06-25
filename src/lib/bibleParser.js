import { BOOK_PATHS } from '../data/books.js';

const BLOCKED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta']);

function cleanElement(element) {
  [...element.querySelectorAll('*')].forEach((child) => {
    const tag = child.tagName.toLowerCase();
    if (BLOCKED_TAGS.has(tag)) {
      child.remove();
      return;
    }

    [...child.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || (name === 'href' && value.startsWith('javascript:'))) {
        child.removeAttribute(attribute.name);
      }
    });
  });

  return element;
}

function nodesToSafeHtml(nodes) {
  const holder = document.createElement('div');
  nodes.forEach((node) => holder.appendChild(node.cloneNode(true)));
  cleanElement(holder);
  return holder.innerHTML;
}

function extractReferencesFromHolder(holder) {
  return [...holder.querySelectorAll('.xref')].map((ref) => ({
    id: ref.dataset.refId || '',
    mark: ref.textContent.trim(),
    note: ref.dataset.note?.trim() || '',
  }));
}

function nodesToVerseData(nodes, verseNumber) {
  const holder = document.createElement('div');
  nodes.forEach((node) => holder.appendChild(node.cloneNode(true)));
  cleanElement(holder);

  [...holder.querySelectorAll('.xref')].forEach((ref, index) => {
    if (!ref.dataset.refId) {
      ref.dataset.refId = `verse-${verseNumber}-ref-${index}`;
    }
  });

  const textHolder = holder.cloneNode(true);
  textHolder.querySelectorAll('.xref').forEach((ref) => ref.remove());

  return {
    html: holder.innerHTML,
    text: textHolder.textContent.replace(/\s+/g, ' ').trim(),
    references: extractReferencesFromHolder(holder),
  };
}

function parseVerses(chapterNodes) {
  const verses = [];
  let currentNumber = null;
  let currentNodes = [];
  const preludeNodes = [];

  const flushVerse = () => {
    if (currentNumber === null) return;
    const verseData = nodesToVerseData(currentNodes, currentNumber);
    verses.push({
      number: String(currentNumber),
      ...verseData,
    });
  };

  chapterNodes.forEach((node) => {
    const isVerseNumber = node.nodeType === Node.ELEMENT_NODE
      && node.tagName.toLowerCase() === 'sup';

    if (isVerseNumber) {
      flushVerse();
      currentNumber = node.textContent.trim();
      currentNodes = [];
      return;
    }

    if (currentNumber === null) {
      preludeNodes.push(node);
    } else {
      currentNodes.push(node);
    }
  });

  flushVerse();

  return {
    preludeHtml: nodesToSafeHtml(preludeNodes),
    verses,
  };
}

export function parseBookHtml(html, fallbackName) {
  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  const body = documentNode.body;
  const name = documentNode.querySelector('h1')?.textContent?.trim() || fallbackName;
  const chapterMarkers = [...body.querySelectorAll('strong')]
    .filter((strong) => /^\d+$/.test(strong.textContent.trim()));

  const chapters = chapterMarkers.map((marker) => {
    const number = marker.textContent.trim();
    const nodes = [];
    let node = marker.nextSibling;

    while (node) {
      const isNextChapter = node.nodeType === Node.ELEMENT_NODE
        && node.tagName.toLowerCase() === 'strong'
        && /^\d+$/.test(node.textContent.trim());
      if (isNextChapter) break;
      nodes.push(node.cloneNode(true));
      node = node.nextSibling;
    }

    const parsed = parseVerses(nodes);
    return {
      number,
      ...parsed,
      references: parsed.verses.flatMap((verse) => verse.references.map((reference) => ({
        ...reference,
        verse: verse.number,
      }))),
    };
  });

  return { name, chapters };
}

export async function fetchBook(bookNumber, fallbackName, signal) {
  let lastError = null;

  for (const path of BOOK_PATHS(bookNumber)) {
    try {
      const response = await fetch(path, { signal });
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      const buffer = await response.arrayBuffer();
      const html = new TextDecoder('utf-8').decode(buffer);
      return parseBookHtml(html, fallbackName);
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      lastError = error;
    }
  }

  throw lastError || new Error(`Book${bookNumber}.html ֆայլը չգտնվեց`);
}

export function normalizeText(text) {
  return String(text)
    .normalize('NFC')
    .toLocaleLowerCase('hy-AM')
    .replace(/[։:.,՝՜՛՞«»"'()\[\]{}—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
