import { groq } from '../config/groq.js';
import { GROQ_MODEL } from '../config/models.js';

const COVERAGE_SYSTEM_PROMPT = `You are the Coverage Analysis Agent in a health insurance policy assistant.
You will be given a user's question and a set of numbered excerpts retrieved from their policy document.
Determine the coverage status for what is being asked, based ONLY on the provided excerpts — do not use outside knowledge about insurance in general, only reason from what is explicitly stated.

Use these definitions to choose the status:
- "Covered": the excerpts state this is covered with no unmet conditions, waiting periods, or pending requirements described.
- "Not Covered": the excerpts state this is permanently excluded, with no path to coverage.
- "Partially Covered": the excerpts state this is covered but only up to a specific sub-limit, cap, or restricted scope.
- "Conditionally Covered": the excerpts state this is covered only once a condition is met — e.g., after a waiting period elapses, only in specific circumstances (like an accident exception), or subject to prior continuous coverage/portability. If the excerpts describe a waiting period or exclusion period that coverage depends on, this is the correct status, NOT "Covered."

Respond with a JSON object only, no extra text, matching this exact shape:
{
  "status": one of ["Covered", "Not Covered", "Partially Covered", "Conditionally Covered"],
  "reasoning": a clear, concise explanation referencing what the excerpts actually say,
  "hasSufficientEvidence": true or false — set to false if the excerpts don't actually address the question,
  "usedChunkNumbers": an array of integers matching ONLY the bracket labels shown before each excerpt (like [1], [2]). Example: if excerpts [2] and [4] support your answer, respond with [2, 4]. NEVER include a number copied from inside the excerpt text itself, such as a duration in months, a page number, or a clause code.
}`;



function formatChunksForPrompt(chunks) {
  return chunks
    .map((chunk, index) => `[${index + 1}] (Page ${chunk.metadata.pageNumber}): ${chunk.text}`)
    .join('\n\n');
}

export async function runCoverageAnalysisAgent({ question, chunks }) {
  const evidenceText = formatChunksForPrompt(chunks);
  const maxIndex = chunks.length;

  const userMessage = `Excerpts (numbered [1] through [${maxIndex}] only — there are no other valid excerpt numbers):

${evidenceText}

Question: ${question}

Reminder: "usedChunkNumbers" must only contain integers between 1 and ${maxIndex}.`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: COVERAGE_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const raw = completion.choices[0].message.content;

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Coverage Analysis Agent returned invalid JSON: ${raw}`);
  }
}