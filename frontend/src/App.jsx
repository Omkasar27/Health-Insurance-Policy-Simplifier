import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Upload from './pages/Upload';
import ProtectedRoute from './components/ProtectedRoute';
import Ask from './pages/Ask';
import Documents from './pages/Documents';
import History from './pages/History';

function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          {
          <Route path="/register" element={<Register />} />
          }
          {
          <Route path="/login" element={<Login />} />
          }
          {
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
          }
          {
            <Route path="/ask" element={<ProtectedRoute><Ask /></ProtectedRoute>} />
          }
          {
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          }
          {
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          }
        </Routes>
      </main>
    </>
  );
}

export default App;