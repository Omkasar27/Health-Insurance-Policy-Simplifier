import { processAndSavePolicy } from '../services/policy.service.js';
import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { embedPolicy } from '../services/embedding.service.js';
import { retrieveRelevantChunks } from '../services/retrieval.service.js';
import fs from 'fs';
import { getPolicyChunkCollection } from '../config/chroma.js';


export async function uploadPolicies(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files were uploaded', 400);
    }

    const results = [];
    for (const file of req.files) {
      results.push(await processAndSavePolicy({ userId: req.user.id, file }));
    }

    res.status(201).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

export async function listPolicies(req, res, next) {
  try {
    const policies = await prisma.policy.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: policies });
  } catch (err) {
    next(err);
  }
}

export async function getPolicy(req, res, next) {
  try {
    const policy = await prisma.policy.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    });
    if (!policy) throw new AppError('Policy not found', 404);
    res.status(200).json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
}



export async function embedPolicyHandler(req, res, next) {
  try {
    const policy = await prisma.policy.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!policy) throw new AppError('Policy not found', 404);

    const result = await embedPolicy(policy.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function testRetrieval(req, res, next) {
  try {
    const { query, policyIds } = req.body;
    if (!query) throw new AppError('query is required', 400);

    const results = await retrieveRelevantChunks({
      query,
      userId: req.user.id,
      policyIds,
      topK: 5,
    });

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}




export async function deletePolicy(req, res, next) {
  try {
    const policy = await prisma.policy.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!policy) throw new AppError('Policy not found', 404);

    const collection = await getPolicyChunkCollection();
    await collection.delete({ where: { policyId: policy.id } });

    await prisma.policy.delete({ where: { id: policy.id } }); // cascades to PolicyPage + DocumentChunk

    try {
      fs.unlinkSync(policy.storagePath);
    } catch (err) {
      console.warn('Could not delete file from disk (non-fatal):', err.message);
    }

    res.status(200).json({ success: true, message: 'Policy deleted' });
  } catch (err) {
    next(err);
  }
}