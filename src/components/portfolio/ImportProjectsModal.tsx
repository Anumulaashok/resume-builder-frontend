import React, { useEffect, useState } from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { resumeService } from '../../services/resume.service';
import { PortfolioProject } from '../../types/portfolio';

interface ImportProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (projects: PortfolioProject[]) => void;
}

interface ExtractedProject {
  id: string;
  sourceResumeTitle: string;
  name: string;
  description: string;
  technologies?: string[];
  url?: string;
}

export const ImportProjectsModal: React.FC<ImportProjectsModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [loading, setLoading] = useState(false);
  const [extractedProjects, setExtractedProjects] = useState<ExtractedProject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    const loadResumeProjects = async () => {
      setLoading(true);
      try {
        const resumes = await resumeService.getResumes();
        const foundProjects: ExtractedProject[] = [];

        resumes.forEach((resume) => {
          const resumeTitle = resume.title || 'Untitled Resume';
          const sections = resume.content?.sections || [];

          sections.forEach((section) => {
            const isProjectSection =
              section.type?.toLowerCase().includes('project') ||
              section.title?.toLowerCase().includes('project');

            if (Array.isArray(section.content)) {
              section.content.forEach((item: any, idx: number) => {
                if (isProjectSection || item.technologies || item.url) {
                  const name = item.name || item.title || `Project ${idx + 1}`;
                  const description = item.description || item.summary || '';
                  const technologies = Array.isArray(item.technologies)
                    ? item.technologies
                    : [];

                  foundProjects.push({
                    id: `${resume.id || resume._id || 'res'}-${section.id}-${item.id || idx}`,
                    sourceResumeTitle: resumeTitle,
                    name,
                    description,
                    technologies,
                    url: item.url || ''
                  });
                }
              });
            }
          });
        });

        setExtractedProjects(foundProjects);
        // By default select all found projects
        setSelectedIds(new Set(foundProjects.map((p) => p.id)));
      } catch (error) {
        toast.error('Failed to load projects from resumes');
      } finally {
        setLoading(false);
      }
    };

    loadResumeProjects();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmImport = () => {
    const toImport = extractedProjects
      .filter((p) => selectedIds.has(p.id))
      .map((p, idx) => ({
        id: `imported-proj-${Date.now()}-${idx}`,
        title: p.name,
        description: p.description,
        tags: p.technologies || [],
        demoUrl: p.url || '',
        githubUrl: '',
        images: []
      }));

    if (toImport.length === 0) {
      toast.error('Please select at least one project to import');
      return;
    }

    onImport(toImport);
    toast.success(`Successfully imported ${toImport.length} project(s)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ArrowDownTrayIcon className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Import Projects from Resumes
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <svg className="animate-spin h-6 w-6 mr-3 text-blue-600" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Scanning your resumes for project records...
            </div>
          ) : extractedProjects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-base font-medium">No project records found in your resumes.</p>
              <p className="text-sm mt-1 text-gray-400">
                You can manually create project cards in the portfolio workspace.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-2">
                Select the project records you wish to import directly into your portfolio showcase:
              </p>
              {extractedProjects.map((p) => {
                const isSelected = selectedIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        className="h-4 w-4 mt-1 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900">{p.name}</h4>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                            {p.sourceResumeTitle}
                          </span>
                        </div>
                        {p.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {p.description}
                          </p>
                        )}
                        {p.technologies && p.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.technologies.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 font-medium"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            {selectedIds.size} of {extractedProjects.length} selected
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={selectedIds.size === 0}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-colors"
            >
              Import Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
