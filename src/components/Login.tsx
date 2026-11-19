import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { authService, AuthUser } from "../services/auth.service";
import Header from "./common/Header";

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginProps {
  onToggleAuth: () => void;
  onLoginSuccess: (user?: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onToggleAuth, onLoginSuccess }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        throw new Error("Please fill in all fields");
      }

      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      });

      toast.success(response.message);
      onLoginSuccess(response.user);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-gradient-to-br from-primary-50 via-neutral-50 to-accent-100">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="max-w-md w-full">
          <div
            data-testid="auth-card"
            className="bg-white p-7 sm:p-8 rounded-panel shadow-auth border border-neutral-200/80 space-y-6"
          >
            <div>
              <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary-600 to-accent-600 rounded-card shadow-sm flex items-center justify-center">
                <LockClosedIcon className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-center text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                Welcome Back
              </h2>
              <p className="mt-1.5 text-center text-sm text-neutral-600">
                Please sign in to your account
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-neutral-700"
                  >
                    Email address
                  </label>
                  <div className="mt-1.5 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-control text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-neutral-700"
                  >
                    Password
                  </label>
                  <div className="mt-1.5 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-control text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-1.5 my-auto h-8 w-8 flex items-center justify-center rounded-control text-neutral-400 hover:text-neutral-600 focus-ring transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <EyeIcon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-neutral-700"
                  >
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() =>
                      alert("Password reset functionality coming soon!")
                    }
                    className="font-medium text-primary-600 hover:text-primary-700 rounded px-1 py-0.5 focus-ring transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 flex items-center justify-center px-4 border border-transparent text-sm font-semibold rounded-control text-white bg-primary-600 hover:bg-primary-700 shadow-sm focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>

            <div className="pt-1 text-center">
              <p className="text-sm text-neutral-600">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={onToggleAuth}
                  className="font-semibold text-primary-600 hover:text-primary-700 rounded px-1 py-0.5 focus-ring transition-colors"
                >
                  Sign up now
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
