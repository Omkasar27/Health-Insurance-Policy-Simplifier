import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const STATUS_COLORS = {
  Covered: 'status-covered',
  'Not Covered': 'status-not-covered',
  'Partially Covered': 'status-partial',
  'Conditionally Covered': 'status-conditional',
};

export default function Ask() {
  const [policies, setPolicies] = useState([]);
  const [selectedPolicyIds, setSelectedPolicyIds] = useState([]);
  const [question, setQuestion] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/policies').then((res) => setPolicies(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function togglePolicy(id) {
    setSelectedPolicyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function startNewConversation() {
    setConversationId(null);
    setMessages([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim() || isAsking) return;

    const currentQuestion = question.trim();
    setQuestion('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text: currentQuestion }]);
    setIsAsking(true);

    try {
      const res = await api.post('/questions', {
        question: currentQuestion,
        conversationId,
        policyIds: selectedPolicyIds.length > 0 ? selectedPolicyIds : undefined,
      });
      const data = res.data.data;
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', data }]);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong asking that question.');
      setMessages((prev) => prev.slice(0, -1)); // remove the optimistic user message on failure
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="page ask-page">
      <h1>Ask a Question</h1>

      {policies.length === 0 ? (
        <p className="page-subtitle">
          You haven't uploaded any policies yet. Go to <strong>Upload</strong> first.
        </p>
      ) : (
        <div className="policy-filter">
          <span className="policy-filter-label">Search within:</span>
          {policies.map((p) => (
            <label key={p.id} className="policy-filter-chip">
              <input
                type="checkbox"
                checked={selectedPolicyIds.includes(p.id)}
                onChange={() => togglePolicy(p.id)}
              />
              {p.name}
            </label>
          ))}
          <span className="policy-filter-hint">
            {selectedPolicyIds.length === 0 ? '(none selected = search all)' : ''}
          </span>
        </div>
      )}

      <div className="chat-window">
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="chat-bubble chat-user">{msg.text}</div>
          ) : (
            <div key={i} className="chat-bubble chat-assistant">
              <p className="answer-text">{msg.data.finalAnswer}</p>

              <div className="answer-meta">
                {msg.data.status && (
                  <span className={`status-badge ${STATUS_COLORS[msg.data.status] || ''}`}>
                    {msg.data.status}
                  </span>
                )}
                <span className="confidence-badge">
                  Confidence: {msg.data.confidenceScore}%
                </span>
              </div>

              {msg.data.citations?.length > 0 && (
                <details className="citations-details">
                  <summary>Citations ({msg.data.citations.length})</summary>
                  <ul>
                    {msg.data.citations.map((c, ci) => (
                      <li key={ci}>
                        <strong>{c.policyName}</strong>, page {c.pageNumber}
                        {c.sectionTitle ? ` — ${c.sectionTitle}` : ''}
                        <p className="citation-excerpt">{c.excerpt}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {msg.data.retrievedChunks?.length > 0 && (
                <details className="chunks-details">
                  <summary>Retrieved Chunks ({msg.data.retrievedChunks.length})</summary>
                  <ul>
                    {msg.data.retrievedChunks.map((c, ci) => (
                      <li key={ci}>
                        <span className="chunk-page">Page {c.metadata?.pageNumber}</span>
                        <p>{c.text}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )
        )}
        {isAsking && <div className="chat-bubble chat-assistant chat-thinking">Thinking...</div>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="form-error">{error}</p>}

      <form onSubmit={handleSubmit} className="ask-form">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Is knee replacement surgery covered?"
          disabled={isAsking || policies.length === 0}
        />
        <button type="submit" className="btn-primary" disabled={isAsking || policies.length === 0}>
          Ask
        </button>
        {messages.length > 0 && (
          <button type="button" className="btn-secondary" onClick={startNewConversation}>
            New Conversation
          </button>
        )}
      </form>
    </div>
  );
}