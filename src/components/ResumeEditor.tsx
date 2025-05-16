import React, { useState } from 'react';
import { PencilIcon, DocumentDuplicateIcon, DocumentArrowDownIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Resume, resumeService } from '../services/resume.service';

interface ResumeEditorProps {
  initialResume?: Resume;
  onSave?: (resume: Resume) => void;
  onBack: () => void;
}

const ResumeEditor: React.FC<ResumeEditorProps> = ({ initialResume, onSave, onBack }) => {
  const [resume, setResume] = useState<Partial<Resume>>(initialResume || {
    title: 'Untitled Resume',
    content: {
      basics: {
        name: '',
        label: '',
        email: '',
        phone: '',
        summary: '',
        location: {
          address: '',
          city: '',
          countryCode: '',
          postalCode: ''
        }
      },
      work: [],
      education: [],
      skills: [],
      languages: [],
      projects: []
    }
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (section: string, value: any) => {
    setResume(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [section]: value
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let savedResume;
      if (initialResume?.id) {
        savedResume = await resumeService.updateResume(initialResume.id, resume);
      } else {
        savedResume = await resumeService.createResume(resume);
      }
      toast.success('Resume saved successfully!');
      onSave?.(savedResume);
    } catch (error) {
      toast.error('Failed to save resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="inline-flex items-center px-2.5 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                  Back
                </button>
                <input
                  type="text"
                  value={resume.title}
                  onChange={(e) => setResume(prev => ({ ...prev, title: e.target.value }))}
                  className="text-xl sm:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full sm:w-auto"
                  placeholder="Resume Title"
                />
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 sm:px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <PencilIcon className="h-4 w-4 mr-1.5" />
                  Save
                </button>
                <button className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 sm:px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <DocumentDuplicateIcon className="h-4 w-4 mr-1.5" />
                  Clone
                </button>
                <button className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 sm:px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Basic Information */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={resume.content?.basics?.name || ''}
                    onChange={(e) => handleChange('basics', { ...resume.content?.basics, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Professional Title
                  </label>
                  <input
                    type="text"
                    value={resume.content?.basics?.label || ''}
                    onChange={(e) => handleChange('basics', { ...resume.content?.basics, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={resume.content?.basics?.email || ''}
                    onChange={(e) => handleChange('basics', { ...resume.content?.basics, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={resume.content?.basics?.phone || ''}
                    onChange={(e) => handleChange('basics', { ...resume.content?.basics, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Professional Summary
                </label>
                <textarea
                  rows={4}
                  value={resume.content?.basics?.summary || ''}
                  onChange={(e) => handleChange('basics', { ...resume.content?.basics, summary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </section>

            {/* Additional sections can be added here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeEditor;
