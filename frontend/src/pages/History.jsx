import { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS_COLORS = {
  Covered: 'status-covered',
  'Not Covered': 'status-not-covered',
  'Partially Covered': 'status-partial',
  'Conditionally Covered': 'status-conditional',
};

export default function History() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/conversations')
      .then((res) => setConversations(res.data.data))
      .catch(() => setError('Could not load your conversation history.'))
      .finally(() => setIsLoadingList(false));
  }, []);

  async function openConversation(id) {
    setIsLoadingDetail(true);
    setError('');
    try {
      const res = await api.get(`/conversations/${id}`);
      setSelected(res.data.data);
    } catch (err) {
      setError('Could not load that conversation.');
    } finally {
      setIsLoadingDetail(false);
    }
  }

  if (isLoadingList) return <div className="page"><p>Loading history...</p></div>;

  if (selected) {
    return (
      <div className="page">
        <button className="btn-secondary back-button" onClick={() => setSelected(null)}>
          ← Back to History
        </button>
        <h1>{selected.title || 'Conversation'}</h1>

        <div className="chat-window">
          {selected.questions.map((q) => (
            <div key={q.id}>
              <div className="chat-bubble chat-user">{q.text}</div>
              {q.response && (
                <div className="chat-bubble chat-assistant">
                  <p className="answer-text">{q.response.finalAnswer}</p>
                  <div className="answer-meta">
                    {q.response.status && (
                      <span className={`status-badge ${STATUS_COLORS[q.response.status] || ''}`}>
                        {q.response.status}
                      </span>
                    )}
                    <span className="confidence-badge">
                      Confidence: {q.response.confidenceScore}%
                    </span>
                  </div>

                  {q.response.citations?.length > 0 && (
                    <details className="citations-details">
                      <summary>Citations ({q.response.citations.length})</summary>
                      <ul>
                        {q.response.citations.map((c, ci) => (
                          <li key={ci}>
                            <strong>{c.policyName}</strong>, page {c.pageNumber}
                            {c.sectionTitle ? ` — ${c.sectionTitle}` : ''}
                            <p className="citation-excerpt">{c.excerpt}</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Chat History</h1>

      {error && <p className="form-error">{error}</p>}

      {conversations.length === 0 ? (
        <p className="page-subtitle">You haven't asked any questions yet.</p>
      ) : (
        <ul className="history-list">
          {conversations.map((c) => (
            <li key={c.id} className="history-item" onClick={() => openConversation(c.id)}>
              <span className="history-title">{c.title || 'Untitled conversation'}</span>
              <span className="history-date">{new Date(c.updatedAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      {isLoadingDetail && <p>Loading conversation...</p>}
    </div>
  );
}