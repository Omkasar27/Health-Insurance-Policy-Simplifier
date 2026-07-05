import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState('checking...');
  const { token } = useAuth();

  useEffect(() => {
    api.get('/health')
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  return (
    <div className="page home">
      <h1>Understand Your Health Insurance Policy</h1>
      <p className="subtitle">
        Upload your policy documents and ask plain-language questions — get grounded,
        cited answers instead of digging through pages of legal text.
      </p>

      <div className="home-actions">
        {token ? (
          <Link to="/ask" className="btn-primary">Ask a Question</Link>
        ) : (
          <Link to="/register" className="btn-primary">Get Started</Link>
        )}
      </div>

      <p className="backend-status">
        Backend status: <strong>{backendStatus}</strong>
      </p>
    </div>
  );
}