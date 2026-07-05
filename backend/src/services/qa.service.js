import prisma from '../config/prisma.js';
import { policyQAGraph } from '../graphs/policyQA.graph.js';
import { AppError } from '../utils/AppError.js';

export async function askQuestion({ userId, conversationId, question, policyIds }) {
  let conversation;

  if (conversationId) {
    conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
    if (!conversation) throw new AppError('Conversation not found', 404);
  } else {
    conversation = await prisma.conversation.create({
      data: { userId, title: question.slice(0, 60) },
    });
  }

  const result = await policyQAGraph.invoke({ question, userId, policyIds });

  const questionRecord = await prisma.question.create({
    data: { conversationId: conversation.id, text: question },
  });

  const response = await prisma.response.create({
    data: {
      questionId: questionRecord.id,
      finalAnswer: result.verification.finalAnswer,
      status: result.verification.verified ? result.coverage.status : null,
      confidenceScore: result.verification.confidenceScore,
      verified: result.verification.verified,
      citations: result.citations,
      retrievedChunks: result.chunks.map((c) => ({
        text: c.text,
        metadata: c.metadata,
        distance: c.distance,
      })),
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return {
    conversationId: conversation.id,
    questionId: questionRecord.id,
    finalAnswer: response.finalAnswer,
    status: response.status,
    confidenceScore: response.confidenceScore,
    verified: response.verified,
    citations: response.citations,
    retrievedChunks: response.retrievedChunks,
  };
}