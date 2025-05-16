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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Generate AI Resume</h2>
              <textarea
                className="w-full h-32 sm:h-40 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Describe your experience, skills, and the type of resume you want... (e.g., 'Create a resume for a software engineer with 5 years of experience in React and Node.js...')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row-reverse sm:justify-start space-y-3 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
                <button
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-medium text-sm sm:text-base"
                  onClick={handleAIGeneration}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Resume'}
                </button>
                <button
                  className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm sm:text-base"
                  onClick={() => setShowPromptModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
