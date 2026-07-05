import { Embeddings } from '@langchain/core/embeddings';
import { pipeline } from '@xenova/transformers';

let extractorPromise = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPromise;
}

export class LocalEmbeddings extends Embeddings {
  constructor(params = {}) {
    super(params);
  }

  async embedQuery(text) {
    const extractor = await getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async embedDocuments(texts) {
    const extractor = await getExtractor();
    const vectors = [];
    for (const text of texts) {
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      vectors.push(Array.from(output.data));
    }
    return vectors;
  }
}

export const embeddings = new LocalEmbeddings();