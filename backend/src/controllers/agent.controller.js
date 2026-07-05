import { runPlannerAgent } from '../agents/planner.agent.js';
import { AppError } from '../utils/AppError.js';
import { runRetrievalAgent } from '../agents/retrieval.agent.js';
import { runCoverageAnalysisAgent } from '../agents/coverageAnalysis.agent.js';
import { runCitationAgent } from '../agents/citation.agent.js';
import { runVerificationAgent } from '../agents/verification.agent.js';


export async function testPlanner(req, res, next) {
  try {
    const { question } = req.body;
    if (!question) throw new AppError('question is required', 400);

    const plan = await runPlannerAgent({ question });
    res.status(200).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}


export async function testRetrievalAgent(req, res, next) {
  try {
    const { question, policyIds } = req.body;
    if (!question) throw new AppError('question is required', 400);

    const plan = await runPlannerAgent({ question });
    const chunks = await runRetrievalAgent({ question, plan, userId: req.user.id, policyIds });

    res.status(200).json({ success: true, data: { plan, chunks } });
  } catch (err) {
    next(err);
  }
}



export async function testCoverageAgent(req, res, next) {
  try {
    const { question, policyIds } = req.body;
    if (!question) throw new AppError('question is required', 400);

    const plan = await runPlannerAgent({ question });
    const chunks = await runRetrievalAgent({ plan, userId: req.user.id, policyIds });
    const coverage = await runCoverageAnalysisAgent({ question, chunks });

    res.status(200).json({ success: true, data: { plan, chunks, coverage } });
  } catch (err) {
    next(err);
  }
}



export async function testCitationAgent(req, res, next) {
  try {
    const { question, policyIds } = req.body;
    if (!question) throw new AppError('question is required', 400);

    const plan = await runPlannerAgent({ question });
    const chunks = await runRetrievalAgent({ plan, userId: req.user.id, policyIds });
    const coverage = await runCoverageAnalysisAgent({ question, chunks });
    const citations = runCitationAgent({ coverage, chunks });

    res.status(200).json({ success: true, data: { plan, coverage, citations } });
  } catch (err) {
    next(err);
  }
}



export async function testVerificationAgent(req, res, next) {
  try {
    const { question, policyIds } = req.body;
    if (!question) throw new AppError('question is required', 400);

    const plan = await runPlannerAgent({ question });
    const chunks = await runRetrievalAgent({ plan, userId: req.user.id, policyIds });
    const coverage = await runCoverageAnalysisAgent({ question, chunks });
    const citations = runCitationAgent({ coverage, chunks });
    const verification = runVerificationAgent({ coverage, citations, chunks });

    res.status(200).json({ success: true, data: { plan, coverage, citations, verification } });
  } catch (err) {
    next(err);
  }
}