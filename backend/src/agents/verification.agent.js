function stripBracketReferences(text) {
  return text
    .replace(/\[\d+\](\s*(,|and)\s*\[\d+\])*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function runVerificationAgent({ coverage, citations, chunks }) {
  const hasEvidence = coverage.hasSufficientEvidence && citations.length > 0;

  if (!hasEvidence) {
    return {
      verified: false,
      finalAnswer: 'I could not find sufficient evidence in the uploaded policy.',
      confidenceScore: 0,
    };
  }

  const usedChunkNumbers = (coverage.usedChunkNumbers || []).filter(
    (n) => Number.isInteger(n) && n >= 1 && n <= chunks.length
  );
  const relevantChunks = usedChunkNumbers.length > 0
    ? usedChunkNumbers.map((n) => chunks[n - 1])
    : [chunks[0]];

  const avgDistance = relevantChunks.reduce((sum, c) => sum + c.distance, 0) / relevantChunks.length;
  const confidenceScore = Math.round(Math.max(0, Math.min(100, 100 - avgDistance * 50)));

  return {
    verified: true,
    finalAnswer: stripBracketReferences(coverage.reasoning),
    confidenceScore,
  };
}