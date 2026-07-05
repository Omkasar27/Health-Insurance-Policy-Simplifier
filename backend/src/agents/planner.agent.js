import { groq } from '../config/groq.js';
import { GROQ_MODEL } from '../config/models.js';

const PLANNER_SYSTEM_PROMPT = `You are the Planner Agent in a health insurance policy assistant.
Given a user's question about their insurance policy, analyze it and respond with a JSON object only, no extra text, matching this exact shape:
{
  "intent": one of ["coverage_check", "waiting_period", "exclusion_check", "limit_check", "general_question"],
  "topic": a short phrase naming the specific treatment, condition, or policy aspect being asked about,
  "searchQueries": an array of 2-3 short search phrases (not full sentences) optimized for semantic search over policy document text, covering likely synonyms or related terms
}`;

export async function runPlannerAgent({ question }) {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: PLANNER_SYSTEM_PROMPT },
      { role: 'user', content: question },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const raw = completion.choices[0].message.content;

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Planner Agent returned invalid JSON: ${raw}`);
  }
}