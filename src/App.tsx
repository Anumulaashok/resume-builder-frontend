import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import HomePage from './components/HomePage';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated } from './utils/token';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  const toggleAuth = () => {
    setIsLogin(!isLogin);
  };

  if (authenticated) {
    return (
      <div className="App w-full min-h-screen">
        <HomePage onLogout={() => setAuthenticated(false)} />
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="App w-full min-h-screen">
      {isLogin ? (
        <Login onToggleAuth={toggleAuth} onLoginSuccess={() => setAuthenticated(true)} />
      ) : (
        <Signup onToggleAuth={toggleAuth} />
      )}
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
