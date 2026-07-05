
import { retrieveRelevantChunks } from '../services/retrieval.service.js';

export async function runRetrievalAgent({ question, plan, userId, policyIds, topKPerQuery = 8, topKFinal = 8 }) {
  const generatedQueries = plan.searchQueries && plan.searchQueries.length > 0
    ? plan.searchQueries
    : [plan.topic];

  const queries = [question, ...generatedQueries]; // always include the literal question too

  const allResults = [];
  for (const query of queries) {
    const results = await retrieveRelevantChunks({ query, userId, policyIds, topK: topKPerQuery });
    allResults.push(...results);
  }

  const merged = new Map();
  for (const r of allResults) {
    const key = `${r.metadata.policyId}-${r.metadata.pageNumber}-${r.metadata.chunkIndex}`;
    if (!merged.has(key) || r.distance < merged.get(key).distance) {
      merged.set(key, r);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, topKFinal);
}