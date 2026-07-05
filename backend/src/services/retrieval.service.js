import { embeddings } from '../config/embeddings.js';
import { getPolicyChunkCollection } from '../config/chroma.js';

export async function retrieveRelevantChunks({ query, userId, policyIds, topK = 5 }) {
  const queryVector = await embeddings.embedQuery(query);
  const collection = await getPolicyChunkCollection();

  const where = policyIds && policyIds.length > 0
    ? { policyId: { $in: policyIds } }
    : { userId };

  const results = await collection.query({
    queryEmbeddings: [queryVector],
    nResults: topK,
    where,
  });

  const documents = results.documents[0] || [];
  const metadatas = results.metadatas[0] || [];
  const distances = results.distances[0] || [];

  return documents.map((text, i) => ({
    text,
    metadata: metadatas[i],
    distance: distances[i],
  }));
}