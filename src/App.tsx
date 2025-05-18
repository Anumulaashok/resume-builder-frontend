import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import HomePage from "./components/HomePage";
import ResumeEditor from "./components/ResumeEditor";
import ResumeList from "./components/ResumeList";
import LoginPage from "./components/Login";
import SignupPage from "./components/Signup";
import { getToken } from "./utils/token";

// Authentication wrapper component that handles redirection
function AuthenticationWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
  }, []);

  // Protected route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  const handleAuthChange = (status: boolean) => {
    setIsAuthenticated(status);
    if (status) {
      // If successfully authenticated, redirect to home
      const from = location.state?.from?.pathname || "/";
      navigate(from);
    }
  };

  const handleToggleAuth = () => {
    setIsLoginView(!isLoginView);
  };

  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <LoginPage
              onLoginSuccess={() => handleAuthChange(true)}
              onToggleAuth={handleToggleAuth}
            />
          }
        />
        <Route
          path="/signup"
          element={<SignupPage onToggleAuth={handleToggleAuth} />}
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage onLogout={() => handleAuthChange(false)} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resumes"
          element={
            <ProtectedRoute>
              <ResumeList
                onEditResume={() => {}}
                onNewResume={() => {}}
                onAIGenerate={() => {}}
                onResumesLoad={() => {}}
              />
            </ProtectedRoute>
          }
        />

        {/* ResumeEditor Routes */}
        <Route
          path="/resume/create"
          element={
            <ProtectedRoute>
              <ResumeEditor onSave={() => {}} onBack={() => {}} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resume/edit/:id"
          element={
            <ProtectedRoute>
              <ResumeEditor onSave={() => {}} onBack={() => {}} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthenticationWrapper />
    </Router>
  );
}

export default App;
