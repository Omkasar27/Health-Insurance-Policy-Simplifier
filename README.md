# Health Insurance Policy Simplifier

An AI assistant that lets users upload health insurance policy PDFs and ask plain-language
questions about coverage — waiting periods, exclusions, room rent limits, procedure-specific
coverage — and get grounded, cited answers instead of digging through pages of legal text.

Built as a hands-on demonstration of an **agentic RAG system**: a five-agent LangGraph
pipeline (Planner → Retrieval → Coverage Analysis → Citation → Verification) that reasons
over real policy documents, cites its sources, and explicitly refuses to answer when the
evidence isn't there — rather than guessing.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [API Documentation](#api-documentation)
- [Evaluation & Known Limitations](#evaluation--known-limitations)
- [Project Structure](#project-structure)
- [Future Improvements](#future-improvements)

---

## Project Overview

Health insurance policy documents are long, dense, and full of jargon — waiting periods,
sub-limits, specified-disease exclusions, portability clauses. This project lets a user
upload one or more policy PDFs (digital or scanned) and ask natural-language questions like:

- *"Is knee replacement surgery covered?"*
- *"What is the waiting period for pre-existing diseases?"*
- *"Is ICU covered?"*

The system answers **only from the uploaded documents**, returns a coverage classification
(Covered / Not Covered / Partially Covered / Conditionally Covered), a confidence score,
and page-level citations — and explicitly says *"I could not find sufficient evidence in
the uploaded policy"* rather than hallucinating an answer when the evidence isn't there.

## Key Features

- **Multi-format PDF ingestion** — automatic detection of digital vs. scanned PDFs, with
  OCR (Tesseract.js) applied only when genuinely needed.
- **Agentic RAG pipeline** — five purpose-built agents orchestrated with LangGraph.js,
  each independently testable and independently verified during development.
- **Grounded, cited answers** — every coverage determination is backed by real retrieved
  policy text, with page numbers and (when detectable) clause references.
- **Anti-hallucination guarantee** — a dedicated Verification Agent gates every answer;
  insufficient evidence produces an explicit fallback, never a guess.
- **Multi-turn conversations** — questions and answers persist per user, with full chat
  history retrievable later.
- **Local, free embeddings** — semantic search runs on a locally-executed embedding model
  (no per-call API cost, no rate limits, no external dependency at query time).
- **Automated evaluation harness** — a standalone script measuring retrieval accuracy,
  citation correctness, faithfulness, and latency against a fixed test set.

## Architecture

```
User Question
     │
     ▼
┌─────────────┐   understands intent, generates
│   Planner   │   search query variations
└─────┬───────┘
      ▼
┌─────────────┐   multi-query semantic search over
│  Retrieval  │   ChromaDB, deduplicated & ranked
└─────┬───────┘
      ▼
┌─────────────┐   classifies coverage status,
│  Coverage   │   reasons ONLY from retrieved text
│  Analysis   │
└─────┬───────┘
      ▼
┌─────────────┐   mechanically derives citations from
│  Citation   │   metadata already attached to chunks
└─────┬───────┘   (no LLM call — hallucination-proof by construction)
      ▼
┌─────────────┐   evidence gate: real answer, or the
│Verification │   required fallback message. Pure logic,
└─────┬───────┘   no LLM call.
      ▼
 Final Answer + Status + Confidence + Citations
```

The graph is intentionally linear for this project's scope (no retry/branching logic),
implemented with LangGraph's `StateGraph` and `Annotation.Root` for shared state across
nodes. The Citation and Verification agents deliberately contain **no LLM calls** — they
derive their output mechanically from data the earlier agents already produced, which is
what makes citations structurally incapable of being fabricated.

### RAG Pipeline

PDF Upload → Text/Scan Detection → Text Extraction (`pdf-parse`) or OCR (`Tesseract.js`) →
Cleaning → Document-wide Chunking (`RecursiveCharacterTextSplitter`, 400 chars / 80 overlap)
→ Local Embedding (`Xenova/all-MiniLM-L6-v2` via `@xenova/transformers`) → ChromaDB Storage
→ Semantic Retrieval (multi-query, deduplicated, metadata-filtered by user/policy).

One deliberate design choice worth calling out: chunking runs across the **entire document**
as continuous text (not page-by-page in isolation) so that content spanning a page break —
common in bulleted exclusion lists — isn't severed from its own heading. Each chunk still
retains an accurate page-number attribution for citation purposes.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, React Router, Axios |
| Backend | Node.js, Express.js (ES Modules) |
| AI Orchestration | LangChain.js, LangGraph.js |
| LLM | Groq API — `openai/gpt-oss-120b` |
| Embeddings | `@xenova/transformers` (local, `all-MiniLM-L6-v2`) |
| Vector Store | ChromaDB (Chroma Cloud) |
| Database | PostgreSQL (Neon), Prisma ORM |
| PDF Processing | `pdf-parse`, `pdf-to-png-converter`, `tesseract.js` |
| Auth | JWT (`jsonwebtoken`), `bcryptjs` |
| Validation | `zod` |

**Why these specific choices:**
- **`openai/gpt-oss-120b` over Llama models on Groq** — Groq deprecated the originally
  selected `llama-3.3-70b-versatile` mid-project; this is Groq's own recommended, currently
  supported replacement, still on the free tier (30 RPM / 1K RPD / 200K TPD).
- **Local embeddings over Hugging Face's Inference API** — HF's hosted embedding API is now
  credit-metered rather than genuinely free, risking mid-project rate limiting. A local model
  has no ongoing cost, no rate limit, and no external dependency once downloaded.
- **`bcryptjs` over `bcrypt`** — the native `bcrypt` package requires a C++ build toolchain;
  `bcryptjs` is pure JS, avoiding Windows-specific compilation issues entirely.
- **`pdf-to-png-converter` over `pdfjs-dist` + `canvas`** — ships prebuilt binaries
  (`@napi-rs/canvas`), avoiding `node-gyp`/native compilation for PDF-to-image rendering.

## Prerequisites

- Node.js 22.13+ and npm
- A free [Neon](https://neon.tech) account (PostgreSQL)
- A free [Chroma Cloud](https://trychroma.com) account (vector database)
- A free [Groq Console](https://console.groq.com) account (LLM API key)

## Installation & Setup

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init

# Frontend
cd ../frontend
npm install
```

1. **Neon** — create a project, copy the pooled connection string into `DATABASE_URL`.
2. **Chroma Cloud** — create a database, copy the API key, tenant ID, and database name.
3. **Groq** — generate an API key from the console.
4. Fill in both `.env` files as described below.

## Environment Variables

**`backend/.env`**
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
GROQ_API_KEY=
CHROMA_API_KEY=
CHROMA_TENANT=
CHROMA_DATABASE=
JWT_SECRET=
JWT_EXPIRES_IN=7d
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000/api
```

## Running the App

```bash
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173`.

**Evaluation script** (optional dev tool, not part of the running app):
```bash
node scripts/evaluate.js <user-email> [comma-separated-policy-ids]
```

## API Documentation

All endpoints except `/health`, `/auth/register`, and `/auth/login` require
`Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account, returns a token |
| POST | `/api/auth/login` | Log in, returns a token |
| GET | `/api/auth/me` | Get the current authenticated user |

**POST `/api/auth/register`**
```json
// Request
{ "email": "user@example.com", "password": "password123", "name": "Jane Doe" }

// Response (201)
{ "success": true, "data": { "token": "...", "user": { "id": "...", "email": "...", "name": "..." } } }
```

### Policies

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/policies` | Upload one or more PDF policies (`multipart/form-data`, field `files`, max 5) |
| GET | `/api/policies` | List the current user's policies |
| GET | `/api/policies/:id` | Get one policy, including extracted pages |
| DELETE | `/api/policies/:id` | Delete a policy (cascades to chunks and vectors) |
| POST | `/api/policies/:id/embed` | Chunk, embed, and store a policy's text |

**POST `/api/policies/:id/embed`**
```json
// Response (200)
{ "success": true, "data": { "chunkCount": 248 } }
```

### Questions & Conversations

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/questions` | Ask a question; runs the full agent pipeline |
| GET | `/api/conversations` | List the current user's conversations |
| GET | `/api/conversations/:id` | Get a conversation with all questions and responses |

**POST `/api/questions`**
```json
// Request
{
  "question": "Is knee replacement surgery covered?",
  "conversationId": null,
  "policyIds": ["21d18d7a-2057-4d95-a809-dd303748c428"]
}

// Response (200)
{
  "success": true,
  "data": {
    "conversationId": "...",
    "questionId": "...",
    "finalAnswer": "The policy covers inpatient hospitalization expenses...",
    "status": "Partially Covered",
    "confidenceScore": 47,
    "verified": true,
    "citations": [
      { "policyName": "ICICI Health Policy", "pageNumber": 5, "sectionTitle": null, "excerpt": "..." }
    ],
    "retrievedChunks": [ { "text": "...", "metadata": { "pageNumber": 5 }, "distance": 1.12 } ]
  }
}
```

### Internal / Development Endpoints

Built during Step 5 to test each LangGraph agent in isolation before wiring them into the
production `/api/questions` endpoint. Left in the codebase for debugging visibility; not
intended for external use.

`POST /api/agents/test-planner`, `test-retrieval-agent`, `test-coverage-agent`,
`test-citation-agent`, `test-verification-agent` — each accepts `{ question, policyIds? }`
and returns the output of the pipeline up to that agent.

## Evaluation & Known Limitations

Measured with `scripts/evaluate.js` against a fixed set of test questions with known,
manually-verified ground truth:

| Metric | Result |
|---|---|
| Retrieval Accuracy | 67–100% |
| Citation Correctness | 100% |
| Faithfulness (LLM-judged) | 33–100% |
| Avg. Latency | ~7–13s per question |

**Honest limitations, found and diagnosed during development, not just assumed:**

- **Retrieval on dense enumerated lists.** Semantic search can under-rank a bulleted
  exclusion list (e.g., a "specified disease/procedure waiting period" list) when the user's
  question phrasing diverges significantly from the document's own legal terminology. The
  system still reasons safely from whatever it retrieves — it does not hallucinate — but may
  cite a less directly relevant clause than the ideal one. Diagnosed via direct chunk
  ranking inspection, not assumed.
- **Coverage Agent bracket-reference reliability.** `openai/gpt-oss-120b` occasionally
  generates prose referencing excerpt numbers (e.g., "excerpt [4]") that don't match its own
  structured `usedChunkNumbers` output — a self-consistency limitation of smaller open-weight
  models on multi-field structured generation, not a retrieval or citation defect. Mitigated
  with range validation and a "cite everything retrieved" fallback when the model's chunk
  references can't be trusted; final user-facing answers have bracket references stripped
  entirely so this internal inconsistency never reaches the UI.
- **Latency.** Each question runs two sequential Groq calls plus local embedding computation
  across a five-agent chain — a genuine architectural cost of thorough, evidence-gated
  reasoning over speed.

## Project Structure

```
backend/
├── src/
│   ├── agents/          # Planner, Retrieval, Coverage, Citation, Verification
│   ├── graphs/           # LangGraph StateGraph assembly
│   ├── config/           # env, prisma, groq, embeddings, chroma, models
│   ├── controllers/
│   ├── middleware/       # auth, upload, error handling
│   ├── routes/
│   ├── services/         # pdfProcessor, policy, chunking, embedding, retrieval, qa
│   └── utils/
├── prisma/schema.prisma
└── scripts/              # evaluate.js and one-off diagnostic scripts
frontend/
└── src/
    ├── pages/            # Home, Register, Login, Upload, Ask, Documents, History
    ├── components/       # Navbar, ProtectedRoute
    ├── context/          # AuthContext
    └── services/api.js
```

## Future Improvements

**From the original scope (deliberately excluded to keep this project achievable):**
- Compare coverage across multiple policies side-by-side
- Automatic policy summarization
- Multi-language support
- Voice-based interaction
- Claim-filing assistance
- Personalized policy recommendations

**Technical improvements identified through this project's own evaluation results:**
- Hybrid keyword + semantic search, or insurance-domain query expansion, to close the
  retrieval gap on dense enumerated exclusion lists
- Structured tool-calling instead of freeform JSON for excerpt referencing, to eliminate
  the Coverage Agent's bracket-consistency limitation at the source
- A background job queue for embedding large documents asynchronously (deliberately out of
  scope here — no Redis, per this project's constraints)
- Rate limiting and production monitoring (deliberately out of scope here, per this
  project's constraints, for the same reason)
