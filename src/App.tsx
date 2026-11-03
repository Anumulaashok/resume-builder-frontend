import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import HomePage from './components/HomePage';
import PublicResumeView from './components/PublicResumeView';
import ShareModal from './components/ShareModal';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated } from './utils/token';

export const getShareTokenFromLocation = (): string | null => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname || '';
  const match = path.match(/^\/share\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  const searchParams = new URLSearchParams(window.location.search || '');
  return searchParams.get('shareToken') || searchParams.get('token') || null;
};

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
    setShareToken(getShareTokenFromLocation());
  }, []);

  const toggleAuth = () => {
    setIsLogin(!isLogin);
  };

  // Demo modal route for verification and documentation screenshots
  if (typeof window !== 'undefined' && window.location.search.includes('demoModal=true')) {
    return (
      <div className="App w-full min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <ShareModal
          isOpen={true}
          onClose={() => {}}
          resumeId="demo-id"
          resumeTitle="Senior Software Architect Resume"
          initialSharing={{
            isPublic: true,
            shareToken: "a4f89d02e3b1c7849102efab82716301",
            privacy: {
              hideEmail: true,
              hidePhone: false,
              hideAddress: true,
            },
          }}
        />
        <Toaster position="top-right" />
      </div>
    );
  }

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
