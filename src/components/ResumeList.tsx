import React, { useState, useEffect } from "react";
import {
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Resume, resumeService } from "../services/resume.service";
import toast from "react-hot-toast";

interface ResumeWithMeta extends Resume {
  id: string;
  updatedAt: string;
}

interface ResumeListProps {
  onEditResume: (resume: Resume) => void;
  onNewResume?: () => void;
  onAIGenerate?: () => void;
  onResumesLoad?: (resumes: ResumeWithMeta[]) => void;
}

export default function ResumeList({
  onEditResume,
  onNewResume,
  onAIGenerate,
  onResumesLoad,
}: ResumeListProps) {
  const [resumes, setResumes] = useState<ResumeWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const data = await resumeService.getResumes();
      setResumes(data || []);
      onResumesLoad?.(data || []);
    } catch (error) {
      toast.error("Failed to load resumes");
      setResumes([]);
      onResumesLoad?.([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (
      !id ||
      !window.confirm("Are you sure you want to delete this resume?")
    ) {
      return;
    }

    try {
      await resumeService.deleteResume(id);
      toast.success("Resume deleted successfully");
      setResumes(resumes.filter((resume) => resume.id !== id));
    } catch (error) {
      toast.error("Failed to delete resume");
    }
  };

  const handleClone = async (resume: ResumeWithMeta) => {
    try {
      const { id: _, updatedAt: __, ...cloneData } = resume;
      const clonedResume = await resumeService.createResume({
        ...cloneData,
        title: `${cloneData.title} (Copy)`,
      });
      toast.success("Resume cloned successfully");
      setResumes((prev) => [...prev, clonedResume]);
    } catch (error) {
      toast.error("Failed to clone resume");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!resumes || resumes.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="max-w-md mx-auto">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No resumes yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating a new resume or let AI help you generate one.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onNewResume}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create New Resume
            </button>
            <button
              onClick={onAIGenerate}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              AI Generate
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {resumes?.map((resume) => (
        <div
          key={resume.id}
          className="bg-white overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
              {resume.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">
              Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => onEditResume(resume)}
                className="flex-1 inline-flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(resume.id)}
                className="flex-1 inline-flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Delete
              </button>
              <button
                onClick={() => handleClone(resume)}
                className="flex-1 inline-flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <DocumentDuplicateIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Clone
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
