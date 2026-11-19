import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import HomePage from './components/HomePage';
import PublicResumeView from './components/PublicResumeView';
import { PortfolioPublicView } from './components/portfolio/PortfolioPublicView';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated } from './utils/token';
import { AUTH_LOGOUT_EVENT } from './services/axios';

export const getShareTokenFromLocation = (): string | null => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname || '';
  const match = path.match(/^\/share\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  const searchParams = new URLSearchParams(window.location.search || '');
  return searchParams.get('shareToken') || null;
};

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

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
    setShareToken(getShareTokenFromLocation());

    const handleLogout = () => setAuthenticated(false);
    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
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

  // If viewing via a public share link, render read-only public viewer without requiring authentication
  if (shareToken) {
    return (
      <div className="App w-full min-h-screen">
        <PublicResumeView shareToken={shareToken} />
        <Toaster position="top-right" />
      </div>
    );
  }

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
