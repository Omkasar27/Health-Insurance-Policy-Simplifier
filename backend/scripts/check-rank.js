import { embeddings } from '../src/config/embeddings.js';
import { getPolicyChunkCollection } from '../src/config/chroma.js';

const policyId = process.argv[2];
const query = process.argv[3];

const vector = await embeddings.embedQuery(query);
const collection = await getPolicyChunkCollection();

const results = await collection.query({
  queryEmbeddings: [vector],
  nResults: 30,
  where: { policyId },
});

results.documents[0].forEach((text, i) => {
  const isMatch = text.includes('Joint replacements');
  console.log(`#${i + 1}  distance=${results.distances[0][i].toFixed(4)}  ${isMatch ? '<-- THE CHUNK WE CARE ABOUT' : ''}`);
});

process.exit(0);