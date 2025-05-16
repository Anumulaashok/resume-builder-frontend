import React, { useState } from 'react';
import { PlusIcon, DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Resume, resumeService } from '../services/resume.service';
import Header from './common/Header';
import ResumeEditor from './ResumeEditor';
import ResumeList from './ResumeList';
import { removeToken } from '../utils/token';

interface HomePageProps {
  onLogout?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLogout }) => {
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'ai'>('list');
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);

  const handleLogout = () => {
    removeToken();
    onLogout?.();
  };

  const handleAIGeneration = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    setLoading(true);
    try {
      const result = await resumeService.generateFromPrompt(prompt);
      toast.success('Resume generated successfully!');
      setShowPromptModal(false);
      setSelectedResume(result.resume);
      setActiveView('editor');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate resume');
    } finally {
      setLoading(false);
    }
  };

  const handleEditResume = (resume: Resume) => {
    setSelectedResume(resume);
    setActiveView('editor');
  };

  const handleNewResume = () => {
    setSelectedResume(null);
    setActiveView('editor');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showLogout onLogout={handleLogout} />
      
      {activeView === 'list' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-6">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Resumes</h1>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={handleNewResume}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Resume
                </button>
                <button
                  onClick={() => setShowPromptModal(true)}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  AI Generate
                </button>
              </div>
            </div>
          </div>
          
          <ResumeList onEditResume={handleEditResume} />
        </div>
      )}

      {activeView === 'editor' && (
        <ResumeEditor
          initialResume={selectedResume || undefined}
          onSave={() => {
            toast.success('Resume saved successfully!');
            setActiveView('list');
          }}
          onBack={() => setActiveView('list')}
        />
      )}

      {/* AI Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-2xl transform transition-all">
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Generate AI Resume</h2>
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your requirements
                  </label>
                  <textarea
                    id="prompt"
                    className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm sm:text-base placeholder-gray-400"
                    placeholder="Describe your experience, skills, and the type of resume you want... (e.g., 'Create a resume for a software engineer with 5 years of experience in React and Node.js...')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 space-y-3 space-y-reverse sm:space-y-0">
                  <button
                    onClick={() => setShowPromptModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAIGeneration}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </div>
                    ) : 'Generate Resume'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
