import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';
import { embeddings } from '../config/embeddings.js';
import { getPolicyChunkCollection } from '../config/chroma.js';
import { chunkPages } from './chunking.service.js';
import { AppError } from '../utils/AppError.js';

export async function embedPolicy(policyId) {
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: { pages: { orderBy: { pageNumber: 'asc' } } },
  });
  if (!policy) throw new AppError('Policy not found', 404);

  const chunks = await chunkPages(policy.pages);
  if (chunks.length === 0) {
    throw new AppError('No usable text found in this policy to embed', 400);
  }

  const collection = await getPolicyChunkCollection();
const ADD_BATCH_SIZE = 100;
  // Delete by metadata filter, not by explicit ID list — this cleans up
  // everything for this policy regardless of how it got there (including
  // any leftover duplicates from earlier runs), with no risk of a stale
  // or malformed ID breaking the request.
  await collection.delete({ where: { policyId } });
  await prisma.documentChunk.deleteMany({ where: { policyId } });

  const chunkTexts = chunks.map((c) => c.text);
  const vectors = await embeddings.embedDocuments(chunkTexts);
  const chromaIds = chunks.map(() => randomUUID());

  await addChunksInBatches(collection, {
  ids: chromaIds,
  embeddings: vectors,
  documents: chunkTexts,
  metadatas: chunks.map((c) => ({
    policyId: policy.id,
    userId: policy.userId,
    policyName: policy.name,
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
  })),
});

  await prisma.documentChunk.createMany({
    data: chunks.map((c, i) => ({
      policyId: policy.id,
      pageNumber: c.pageNumber,
      chunkIndex: c.chunkIndex,
      text: c.text,
      chromaId: chromaIds[i],
    })),
  });

  await prisma.policy.update({ where: { id: policy.id }, data: { status: 'embedded' } });

  return { chunkCount: chunks.length };

  

async function addChunksInBatches(collection, { ids, embeddings, documents, metadatas }) {
  for (let i = 0; i < ids.length; i += ADD_BATCH_SIZE) {
    await collection.add({
      ids: ids.slice(i, i + ADD_BATCH_SIZE),
      embeddings: embeddings.slice(i, i + ADD_BATCH_SIZE),
      documents: documents.slice(i, i + ADD_BATCH_SIZE),
      metadatas: metadatas.slice(i, i + ADD_BATCH_SIZE),
    });
  }
}
}