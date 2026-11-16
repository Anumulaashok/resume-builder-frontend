import React from 'react';
import { DocumentTextIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  showLogout?: boolean;
  onLogout?: () => void;
  activeTab?: 'resumes' | 'portfolios';
  onTabChange?: (tab: 'resumes' | 'portfolios') => void;
}

const Header: React.FC<HeaderProps> = ({
  showLogout = false,
  onLogout,
  activeTab = 'resumes',
  onTabChange
}) => {
  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6 sm:space-x-8">
            <div className="flex items-center cursor-pointer" onClick={() => onTabChange?.('resumes')}>
              <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <span className="ml-2 text-lg sm:text-xl font-bold text-gray-900">Smart CV & Portfolio</span>
            </div>

            {/* Navigation Tabs */}
            {onTabChange && (
              <nav className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={() => onTabChange('resumes')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                    activeTab === 'resumes'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>Resumes</span>
                </button>
                <button
                  onClick={() => onTabChange('portfolios')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                    activeTab === 'portfolios'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <GlobeAltIcon className="w-4 h-4" />
                  <span>Portfolios</span>
                </button>
              </nav>
            )}
          </div>

          {showLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
