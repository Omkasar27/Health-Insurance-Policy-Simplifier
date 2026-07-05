import { askQuestion } from '../services/qa.service.js';
import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

export async function ask(req, res, next) {
  try {
    const { question, conversationId, policyIds } = req.body;
    if (!question) throw new AppError('question is required', 400);

    const result = await askQuestion({ userId: req.user.id, conversationId, question, policyIds });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function listConversations(req, res, next) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.status(200).json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
}

export async function getConversation(req, res, next) {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { questions: { orderBy: { createdAt: 'asc' }, include: { response: true } } },
    });
    if (!conversation) throw new AppError('Conversation not found', 404);
    res.status(200).json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
}