import { CloudClient } from 'chromadb';
import { env } from './env.js';

const client = new CloudClient({
  apiKey: env.chroma.apiKey,
  tenant: env.chroma.tenant,
  database: env.chroma.database,
});

let collectionPromise = null;

export function getPolicyChunkCollection() {
  if (!collectionPromise) {
    collectionPromise = client.getOrCreateCollection({ name: 'policy_chunks' });
  }
  return collectionPromise;
}