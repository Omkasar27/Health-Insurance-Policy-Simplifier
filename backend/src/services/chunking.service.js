import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 400,
  chunkOverlap: 80,
});

const PAGE_SEPARATOR = ' ';

export async function chunkPages(pages) {
  // Concatenate all pages into one continuous text, tracking each page's
  // character range within it. This lets a chunk span a page boundary —
  // e.g. a bulleted list that starts on page 21 and continues on page 22 —
  // instead of being severed from its own heading with no context.
  let fullText = '';
  const pageRanges = [];

  for (const page of pages) {
    if (!page.text || page.text.trim().length === 0) continue;
    const start = fullText.length;
    fullText += page.text + PAGE_SEPARATOR;
    pageRanges.push({ pageNumber: page.pageNumber, start, end: fullText.length });
  }

  if (fullText.trim().length === 0) return [];

  const pieces = await splitter.splitText(fullText);

  const chunks = [];
  const chunkIndexOnPage = {};
  let searchFrom = 0;

  for (const text of pieces) {
    let idx = fullText.indexOf(text, searchFrom);
    if (idx === -1) idx = fullText.indexOf(text); // fallback, shouldn't normally trigger
    searchFrom = idx + 1;

    const page = pageRanges.find((p) => idx >= p.start && idx < p.end) || pageRanges[pageRanges.length - 1];
    chunkIndexOnPage[page.pageNumber] = (chunkIndexOnPage[page.pageNumber] ?? -1) + 1;

    chunks.push({ pageNumber: page.pageNumber, chunkIndex: chunkIndexOnPage[page.pageNumber], text });
  }

  return chunks;
}