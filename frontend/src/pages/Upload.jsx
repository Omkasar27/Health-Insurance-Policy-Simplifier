import { useState } from 'react';
import api from '../services/api';

const STATUS_LABELS = {
  uploading: 'Uploading...',
  embedding: 'Preparing for Q&A...',
  ready: 'Ready to ask questions',
  error: 'Failed',
};

export default function Upload() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileChange(e) {
    setSelectedFiles(Array.from(e.target.files));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsSubmitting(true);
    setItems(selectedFiles.map((f) => ({ name: f.name, status: 'uploading', error: null })));

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));

      const res = await api.post('/policies', formData);
      const uploadedPolicies = res.data.data;

      setItems((prev) => prev.map((item) => ({ ...item, status: 'embedding' })));

      await Promise.all(
        uploadedPolicies.map(async (policy, i) => {
          try {
            await api.post(`/policies/${policy.id}/embed`);
            setItems((prev) =>
              prev.map((item, idx) => (idx === i ? { ...item, status: 'ready' } : item))
            );
          } catch {
            setItems((prev) =>
              prev.map((item, idx) =>
                idx === i ? { ...item, status: 'error', error: 'Could not prepare this document for Q&A' } : item
              )
            );
          }
        })
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((item) => ({ ...item, status: 'error', error: err.response?.data?.message || 'Upload failed' }))
      );
    } finally {
      setIsSubmitting(false);
      setSelectedFiles([]);
    }
  }

  return (
    <div className="page">
      <h1>Upload Policy Documents</h1>
      <p className="page-subtitle">
        Upload one or more PDF policy documents. We'll extract the text (using OCR
        automatically for scanned copies) and prepare them so you can ask questions right away.
      </p>

      <form onSubmit={handleSubmit} className="upload-form">
        <input type="file" accept="application/pdf" multiple onChange={handleFileChange} />
        <button type="submit" className="btn-primary" disabled={isSubmitting || selectedFiles.length === 0}>
          {isSubmitting ? 'Processing...' : `Upload ${selectedFiles.length || ''} File${selectedFiles.length === 1 ? '' : 's'}`}
        </button>
      </form>

      {items.length > 0 && (
        <ul className="upload-status-list">
          {items.map((item, i) => (
            <li key={i} className={`upload-status-item status-${item.status}`}>
              <span className="upload-file-name">{item.name}</span>
              <span className="upload-status-badge">{item.status === 'error' ? item.error : STATUS_LABELS[item.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}