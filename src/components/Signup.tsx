import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { EnvelopeIcon, LockClosedIcon, UserIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authService } from '../services/auth.service';
import { validatePassword } from '../utils/validation';
import Header from './common/Header';

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface SignupProps {
  onToggleAuth: () => void;
}

const Signup: React.FC<SignupProps> = ({ onToggleAuth }) => {
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.email || !formData.password || !formData.name) {
        throw new Error('Please fill in all fields');
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      const { isValid, errors } = validatePassword(formData.password);
      if (!isValid) {
        throw new Error(errors.join('\n'));
      }
      const response = await authService.signup({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      toast.success(response.message);
      onToggleAuth();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
                <UserIcon className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-center text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                Create an Account
              </h2>
              <p className="mt-1.5 text-center text-sm text-neutral-600">
                Join us today and create your professional resume
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
                    Full Name
                  </label>
                  <div className="mt-1.5 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-control text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
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
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                    Password
                  </label>
                  <p className="text-xs text-neutral-500 mt-1">
                    Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.
                  </p>
                  <div className="mt-1.5 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-control text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
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

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
                    Confirm Password
                  </label>
                  <div className="mt-1.5 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-control text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute inset-y-0 right-1.5 my-auto h-8 w-8 flex items-center justify-center rounded-control text-neutral-400 hover:text-neutral-600 focus-ring transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <EyeIcon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 flex items-center justify-center px-4 border border-transparent text-sm font-semibold rounded-control text-white bg-primary-600 hover:bg-primary-700 shadow-sm focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Sign up'
                  )}
                </button>
              </div>
            </form>

            <div className="pt-1 text-center">
              <p className="text-sm text-neutral-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onToggleAuth}
                  className="font-semibold text-primary-600 hover:text-primary-700 rounded px-1 py-0.5 focus-ring transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Signup;
