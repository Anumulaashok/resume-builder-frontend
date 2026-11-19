import React, { useState, useEffect, useRef } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import HomePage from './components/HomePage';
import PublicResumeView from './components/PublicResumeView';
import ReauthModal from './components/ReauthModal';
import { PortfolioPublicView } from './components/portfolio/PortfolioPublicView';
import { Toaster } from 'react-hot-toast';
import { useIsSmUp } from './components/common/Header';
import { getStoredUser, isAuthenticated, StoredUser } from './utils/token';
import { AuthModalContext, authEventBus } from './utils/authEventBus';

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

export const getPublicSlugFromLocation = (): string | null => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname || '';
  const match = path.match(/^\/r\/([a-zA-Z0-9_-]+)\/?$/);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  const hash = window.location.hash || '';
  const hashMatch = hash.match(/^#\/r\/([a-zA-Z0-9_-]+)\/?$/);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1].toLowerCase();
  }
  return null;
};

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(() =>
    isAuthenticated() ? getStoredUser() : null
  );
  const [shareToken, setShareToken] = useState<string | null>(() =>
    getShareTokenFromLocation()
  );
  const [publicSlug, setPublicSlug] = useState<string | null>(() =>
    getPublicSlugFromLocation()
  );
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthEmail, setReauthEmail] = useState<string>('');
  const isSmUp = useIsSmUp();
  const toastPosition = isSmUp ? 'top-center' : 'bottom-center';

  const authenticatedRef = useRef(authenticated);
  authenticatedRef.current = authenticated;
  const userRef = useRef(user);
  userRef.current = user;

  // Detect unauthenticated public portfolio view
  const pathname = window.location.pathname;
  const hash = window.location.hash;
  const isPublicPortfolio =
    pathname.startsWith('/p/') ||
    pathname.startsWith('/portfolio/') ||
    hash.startsWith('#/p/') ||
    hash.startsWith('#/portfolio/');

  useEffect(() => {
    const authed = isAuthenticated();
    setAuthenticated(authed);
    authenticatedRef.current = authed;
    const storedUser = authed ? getStoredUser() : null;
    setUser(storedUser);
    userRef.current = storedUser;
    if (storedUser?.email) {
      setReauthEmail(storedUser.email);
    }
    setShareToken(getShareTokenFromLocation());
    setPublicSlug(getPublicSlugFromLocation());

    const unsubscribeExpired = authEventBus.onSessionExpired((detail) => {
      if (!authenticatedRef.current) return;
      const emailHint = detail.email || userRef.current?.email || '';
      if (emailHint) {
        setReauthEmail(emailHint);
      }
      setShowReauthModal(true);
    });

    const unsubscribeOpenReauth = authEventBus.onOpenReauth((detail) => {
      if (!authenticatedRef.current) return;
      const emailHint = detail.email || userRef.current?.email || '';
      if (emailHint) {
        setReauthEmail(emailHint);
      }
      setShowReauthModal(true);
    });

    const unsubscribeReauthenticated = authEventBus.onReauthenticated(
      (detail) => {
        const nextUser = detail.user || getStoredUser();
        setUser(nextUser);
        if (nextUser?.email) {
          setReauthEmail(nextUser.email);
        }
        setAuthenticated(true);
        setShowReauthModal(false);
      }
    );

    return () => {
      unsubscribeExpired();
      unsubscribeOpenReauth();
      unsubscribeReauthenticated();
    };
  }, []);

  // Unauthenticated visitor view for published portfolios via slug
  if (isPublicPortfolio) {
    return (
      <div className="App w-full min-h-screen">
        <PortfolioPublicView />
        <Toaster position={toastPosition} />
      </div>
    );
  }

  const toggleAuth = () => {
    setIsLogin(!isLogin);
  };

  // If viewing via a public share link or custom slug (/r/:slug), render read-only public viewer without requiring authentication
  if (shareToken || publicSlug) {
    return (
      <div className="App w-full min-h-screen">
        <PublicResumeView
          shareToken={shareToken || undefined}
          slug={publicSlug || undefined}
        />
        <Toaster position={toastPosition} />
      </div>
    );
  }

  if (authenticated) {
    return (
      <AuthModalContext.Provider value={{ hasGlobalModal: true }}>
        <div className="App w-full min-h-screen">
          <HomePage
            user={user}
            onLogout={() => {
              setShowReauthModal(false);
              setUser(null);
              setAuthenticated(false);
            }}
          />
          <ReauthModal
            isOpen={showReauthModal}
            initialEmail={reauthEmail || user?.email || ''}
            onSuccess={(loggedInUser) => {
              const resolvedUser = loggedInUser || getStoredUser();
              setUser(resolvedUser);
              if (resolvedUser?.email) {
                setReauthEmail(resolvedUser.email);
              }
              setAuthenticated(true);
              setShowReauthModal(false);
            }}
            onDismiss={() => {
              setShowReauthModal(false);
            }}
          />
          <Toaster position={toastPosition} />
        </div>
      </AuthModalContext.Provider>
    );
  }

  return (
    <div className="App w-full min-h-screen">
      {isLogin ? (
        <Login
          onToggleAuth={toggleAuth}
          onLoginSuccess={(loggedInUser) => {
            const resolvedUser = loggedInUser || getStoredUser();
            setUser(resolvedUser);
            if (resolvedUser?.email) {
              setReauthEmail(resolvedUser.email);
            }
            setAuthenticated(true);
          }}
        />
      ) : (
        <Signup onToggleAuth={toggleAuth} />
      )}
      <Toaster position={toastPosition} />
    </div>
  );
}

export default App;
