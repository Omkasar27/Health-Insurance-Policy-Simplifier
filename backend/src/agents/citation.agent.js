
const FALLBACK_CITATION_COUNT = 3;


function extractSectionTitle(text) {
  // Looks for patterns like "Excl04", "C1.", "5. Permanent Exclusions" near the start of a chunk
  const match = text.match(/^(?:[A-Za-z]{2,6}\d{1,3}[.:]?|(?:\d{1,2}\.){1,2}\s*[A-Z][^\n]{3,60})/);
  return match ? match[0].trim() : null;
}

export function runCitationAgent({ coverage, chunks }) {
  let usedNumbers = (coverage.usedChunkNumbers || []).filter(
    (num) => Number.isInteger(num) && num >= 1 && num <= chunks.length
  );

  if (usedNumbers.length === 0 && coverage.hasSufficientEvidence && chunks.length > 0) {
    console.warn(
      `Coverage Agent returned invalid chunk numbers (got: ${JSON.stringify(coverage.usedChunkNumbers)}, ` +
      `valid range was 1-${chunks.length}) — citing all retrieved chunks, since we can't trust which specific ones it meant.`
    );
    usedNumbers = chunks.map((_, i) => i + 1); // cite everything it actually saw, not a guessed subset
  }

  const citations = usedNumbers
    .map((num) => chunks[num - 1])
    .filter(Boolean)
    .map((chunk) => ({
      policyName: chunk.metadata.policyName,
      pageNumber: chunk.metadata.pageNumber,
      sectionTitle: extractSectionTitle(chunk.text),
      excerpt: chunk.text.slice(0, 200) + (chunk.text.length > 200 ? '...' : ''),
    }));

  const seen = new Set();
  return citations.filter((c) => {
    const key = `${c.policyName}-${c.pageNumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}