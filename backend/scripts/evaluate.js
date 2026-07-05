import prisma from '../src/config/prisma.js';
import { askQuestion } from '../src/services/qa.service.js';
import { groq } from '../src/config/groq.js';
import { GROQ_MODEL } from '../src/config/models.js';

const TEST_USER_EMAIL = process.argv[2] || 'test@example.com';
const POLICY_IDS = process.argv[3] ? process.argv[3].split(',') : undefined;

// Ground truth for each question, based on what we already confirmed by hand
// while building Steps 4-6. expectedPages: [] means "this should correctly
// fall back to no evidence found" — an empty array is itself a valid ground truth.
const TEST_CASES = [
  {
    question: 'What is the waiting period for pre-existing diseases?',
    expectedPages: [21, 22],
    expectVerified: true,
  },
  {
    question: 'Are diagnostic tests and investigations for evaluation purposes covered?',
    expectedPages: [22],
    expectVerified: true,
  },
  {
    question: 'Does this policy cover damage to my car after an accident?',
    expectedPages: [],
    expectVerified: false,
  },
  {
    question: 'Is knee replacement surgery covered?',
    expectedPages: [21, 22],
    expectVerified: true,
  },
];

function checkRetrievalAccuracy(expectedPages, retrievedChunks) {
  if (expectedPages.length === 0) return null; // n/a — nothing was expected to be found
  const retrievedPages = new Set(retrievedChunks.map((c) => c.metadata?.pageNumber));
  return expectedPages.some((p) => retrievedPages.has(p)) ? 1 : 0;
}

function checkCitationCorrectness(citations, retrievedChunks) {
  if (citations.length === 0) return null; // n/a — nothing was cited to check
  const stripEllipsis = (text) => (text.endsWith('...') ? text.slice(0, -3) : text);

  const validCount = citations.filter((c) =>
    retrievedChunks.some(
      (chunk) => chunk.metadata?.pageNumber === c.pageNumber && chunk.text.startsWith(stripEllipsis(c.excerpt))
    )
  ).length;

  return validCount / citations.length;
}

async function judgeFaithfulness(finalAnswer, citations, retrievedChunks) {
  if (citations.length === 0) return null;

  // Use the FULL retrieved chunk text as evidence, not the truncated 200-char
  // citation preview (that's a UI-display convenience, not the actual context
  // the Coverage Agent reasoned over) — otherwise the judge only sees half a chunk.
  const evidenceText = citations
    .map((c, i) => {
      const fullChunk = retrievedChunks.find((rc) => rc.metadata?.pageNumber === c.pageNumber);
      return `[${i + 1}] ${fullChunk ? fullChunk.text : c.excerpt}`;
    })
    .join('\n\n');

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a strict evaluator. Given an AI-generated answer and supporting excerpts, determine whether the factual claims in the answer are supported by the excerpts.

Important: the answer may reference excerpts using bracketed numbers like [1] or [2]. These numbers come from a DIFFERENT internal numbering scheme used during generation and do NOT correspond to the numbering of the excerpts shown below. Ignore all bracket numbers entirely — judge only whether the substantive factual claims in the answer are actually supported by the content of the excerpts provided, regardless of which number the answer cites.

Respond with JSON only: { "faithful": true or false, "reason": "short explanation" }`,
      },
      { role: 'user', content: `Excerpts:\n${evidenceText}\n\nAnswer: ${finalAnswer}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return { faithful: null, reason: 'judge returned invalid JSON' };
  }
}

function printReport(results) {
  console.log('\n=== Evaluation Report ===\n');

  results.forEach((r) => {
  console.log(`Q: ${r.question}`);
  console.log(`  Answer: ${r.finalAnswer}`);
  console.log(`  Verified as expected: ${r.verifiedMatch}`);
  console.log(`  Retrieval accuracy: ${r.retrievalScore === null ? 'n/a' : r.retrievalScore}`);
  console.log(`  Citation correctness: ${r.citationScore === null ? 'n/a' : (r.citationScore * 100).toFixed(0) + '%'}`);
  console.log(`  Faithful: ${r.faithful === undefined || r.faithful === null ? 'n/a' : r.faithful}`);
  if (r.faithfulReason) console.log(`  Faithfulness reason: ${r.faithfulReason}`);
  console.log(`  Latency: ${r.latencyMs}ms\n`);
});

  const avg = (arr) => (arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

  const avgRetrieval = avg(results.map((r) => r.retrievalScore).filter((v) => v !== null));
  const avgCitation = avg(results.map((r) => r.citationScore).filter((v) => v !== null));
  const faithfulResults = results.map((r) => r.faithful).filter((v) => v !== undefined && v !== null);
  const faithfulRate = faithfulResults.length > 0 ? faithfulResults.filter(Boolean).length / faithfulResults.length : null;

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const avgLatency = avg(latencies);
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] ?? latencies[latencies.length - 1];

  console.log('=== Summary ===');
  console.log(`Retrieval Accuracy: ${avgRetrieval === null ? 'n/a' : (avgRetrieval * 100).toFixed(0) + '%'}`);
  console.log(`Citation Correctness: ${avgCitation === null ? 'n/a' : (avgCitation * 100).toFixed(0) + '%'}`);
  console.log(`Faithfulness: ${faithfulRate === null ? 'n/a' : (faithfulRate * 100).toFixed(0) + '%'}`);
  console.log(`Avg Latency: ${avgLatency.toFixed(0)}ms`);
  console.log(`P95 Latency: ${p95Latency}ms`);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TEST_USER_EMAIL } });
  if (!user) {
    console.error(`No user found with email ${TEST_USER_EMAIL}`);
    process.exit(1);
  }

  const results = [];

  for (const testCase of TEST_CASES) {
    const start = Date.now();
    const result = await askQuestion({ userId: user.id, question: testCase.question, policyIds: POLICY_IDS });
    const latencyMs = Date.now() - start;

    const retrievalScore = checkRetrievalAccuracy(testCase.expectedPages, result.retrievedChunks);
    const citationScore = checkCitationCorrectness(result.citations, result.retrievedChunks);
   const faithfulness = await judgeFaithfulness(result.finalAnswer, result.citations, result.retrievedChunks);
   
results.push({
  question: testCase.question,
  verifiedMatch: result.verified === testCase.expectVerified,
  retrievalScore,
  citationScore,
  faithful: faithfulness?.faithful,
  faithfulReason: faithfulness?.reason, // add this
  finalAnswer: result.finalAnswer,      // and this, so we can see what was actually judged
  latencyMs,
});
  }

  printReport(results);
  process.exit(0);
}

main();