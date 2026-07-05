import { PDFParse } from 'pdf-parse';
import { pdfToPng } from 'pdf-to-png-converter';
import { createWorker } from 'tesseract.js';
import fs from 'fs';

const MIN_CHARS_PER_PAGE = 20; // below this average, we treat the PDF as scanned

export async function extractSelectableText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });

  try {
    const result = await parser.getText();

    if (!result.pages || result.pages.length === 0) {
      console.warn('pdf-parse: no per-page breakdown found. Result keys:', Object.keys(result));
      return [result.text || ''];
    }

    return result.pages.map((page) => page.text || '');
  } finally {
    try {
      await parser.destroy();
    } catch (destroyErr) {
      console.warn('parser.destroy() failed (non-fatal, safe to ignore):', destroyErr.message);
    }
  }
}

export async function ocrPdf(filePath) {
  const pngPages = await pdfToPng(filePath, { viewportScale: 2.0 });
  const worker = await createWorker('eng');

  const pages = [];
  for (const page of pngPages) {
    const { data } = await worker.recognize(page.content);
    pages.push(data.text);
  }

  await worker.terminate();
  return pages;
}

export function needsOcr(pages) {
  if (pages.length === 0) return true;
  const totalChars = pages.reduce((sum, p) => sum + p.trim().length, 0);
  return totalChars / pages.length < MIN_CHARS_PER_PAGE;
}

export function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}