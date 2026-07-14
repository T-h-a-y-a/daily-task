import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);

  // Initialize Default Admin & Check for existing session in localStorage
  useEffect(() => {
    // Seed default admin if no users exist
    const savedUsers = localStorage.getItem('dashboard_users');
    if (!savedUsers) {
      const defaultAdmin = {
        id: 'default-admin-id',
        username: 'admin',
        password: 'password', // Default password
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('dashboard_users', JSON.stringify([defaultAdmin]));
    }

    // Check for logged-in user session
    const savedSession = localStorage.getItem('dashboard_session');
    if (savedSession) {
      setUser(JSON.parse(savedSession));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('dashboard_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('dashboard_session');
  };

  return (
    <>
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
