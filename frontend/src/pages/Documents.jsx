import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Documents() {
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPolicies();
  }, []);

  async function loadPolicies() {
    setIsLoading(true);
    try {
      const res = await api.get('/policies');
      setPolicies(res.data.data);
    } catch (err) {
      setError('Could not load your documents.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setDeletingId(id);
    try {
      await api.delete(`/policies/${id}`);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this document.');
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return <div className="page"><p>Loading your documents...</p></div>;

  return (
    <div className="page">
      <h1>Uploaded Documents</h1>

      {error && <p className="form-error">{error}</p>}

      {policies.length === 0 ? (
        <p className="page-subtitle">You haven't uploaded any policy documents yet.</p>
      ) : (
        <table className="documents-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Pages</th>
              <th>Type</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.pageCount}</td>
                <td>{p.isScanned ? 'Scanned (OCR)' : 'Digital'}</td>
                <td>
                  <span className={`doc-status doc-status-${p.status}`}>{p.status}</span>
                </td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={deletingId === p.id}
                  >
                    {deletingId === p.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}