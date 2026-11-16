import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import HomePage from './components/HomePage';
import { PortfolioPublicView } from './components/portfolio/PortfolioPublicView';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated } from './utils/token';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Detect unauthenticated public portfolio view
  const pathname = window.location.pathname;
  const hash = window.location.hash;
  const isPublicPortfolio =
    pathname.startsWith('/p/') ||
    pathname.startsWith('/portfolio/') ||
    hash.startsWith('#/p/') ||
    hash.startsWith('#/portfolio/');

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  // Unauthenticated visitor view for published portfolios via slug
  if (isPublicPortfolio) {
    return (
      <div className="App w-full min-h-screen">
        <PortfolioPublicView />
        <Toaster position="top-right" />
      </div>
    );
  }

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
