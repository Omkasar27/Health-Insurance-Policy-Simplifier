import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Policy Simplifier</Link>
      <div className="navbar-links">
        {token ? (
          <>
            <Link to="/upload">Upload</Link>
            <Link to="/ask">Ask</Link>
            <Link to="/documents">Documents</Link>
            <Link to="/history">History</Link>
            <span className="navbar-user">{user?.name || user?.email}</span>
            <button onClick={handleLogout} className="btn-link">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}