import { CloudClient } from 'chromadb';
import { env } from '../src/config/env.js';

const client = new CloudClient({
  apiKey: env.chroma.apiKey,
  tenant: env.chroma.tenant,
  database: env.chroma.database,
});

const collection = await client.getOrCreateCollection({ name: 'setup-test' });
console.log('✅ Connected to Chroma Cloud. Collection:', collection.name);