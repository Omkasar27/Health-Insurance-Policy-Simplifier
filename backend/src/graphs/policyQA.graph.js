import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { runPlannerAgent } from '../agents/planner.agent.js';
import { runRetrievalAgent } from '../agents/retrieval.agent.js';
import { runCoverageAnalysisAgent } from '../agents/coverageAnalysis.agent.js';
import { runCitationAgent } from '../agents/citation.agent.js';
import { runVerificationAgent } from '../agents/verification.agent.js';

const QAState = Annotation.Root({
  question: Annotation(),
  userId: Annotation(),
  policyIds: Annotation(),
  plan: Annotation(),
  chunks: Annotation(),
  coverage: Annotation(),
  citations: Annotation(),
  verification: Annotation(),
});

async function plannerNode(state) {
  const plan = await runPlannerAgent({ question: state.question });
  return { plan };
}

async function retrievalNode(state) {
  const chunks = await runRetrievalAgent({
    question: state.question,
    plan: state.plan,
    userId: state.userId,
    policyIds: state.policyIds,
  });
  return { chunks };
}

async function coverageNode(state) {
  const coverage = await runCoverageAnalysisAgent({ question: state.question, chunks: state.chunks });
  return { coverage };
}

function citationNode(state) {
  const citations = runCitationAgent({ coverage: state.coverage, chunks: state.chunks });
  return { citations };
}

function verificationNode(state) {
  const verification = runVerificationAgent({
    coverage: state.coverage,
    citations: state.citations,
    chunks: state.chunks,
  });
  return { verification };
}

const workflow = new StateGraph(QAState)
  .addNode('planStep', plannerNode)
  .addNode('retrieveStep', retrievalNode)
  .addNode('analyzeCoverageStep', coverageNode)
  .addNode('citeStep', citationNode)
  .addNode('verifyStep', verificationNode)
  .addEdge(START, 'planStep')
  .addEdge('planStep', 'retrieveStep')
  .addEdge('retrieveStep', 'analyzeCoverageStep')
  .addEdge('analyzeCoverageStep', 'citeStep')
  .addEdge('citeStep', 'verifyStep')
  .addEdge('verifyStep', END);

export const policyQAGraph = workflow.compile();