import React, { useState, useEffect } from "react";
import { resumeService } from "../services/resume.service";
import { IResume } from "../types/resume";
import ResumePreview from "./ResumePreview";
import {
  ExclamationTriangleIcon,
  EyeIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface PublicResumeViewProps {
  shareToken: string;
}

export const PublicResumeView: React.FC<PublicResumeViewProps> = ({
  shareToken,
}) => {
  const [resume, setResume] = useState<IResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    resumeService
      .getPublicResume(shareToken)
      .then((data) => {
        if (isMounted) {
          if (data) {
            setResume(data);
          } else {
            setError(
              "This shared resume link is invalid, has expired, or has been revoked by the owner."
            );
          }
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(
            err?.message ||
              "This shared resume link is invalid, has expired, or has been revoked by the owner."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shareToken]);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4"
        data-testid="public-resume-loading"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-300 text-sm font-medium">Loading resume...</p>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div
        className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4"
        data-testid="public-resume-error"
      >
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-900 bg-opacity-40 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-800">
            <ExclamationTriangleIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Resume Unavailable
          </h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            {error ||
              "This shared resume link is invalid, has expired, or has been revoked by the owner."}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
          >
            Go to Resume Builder
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-900 flex flex-col"
      data-testid="public-resume-view"
    >
      {/* Top Banner indicating read-only shared view */}
      <header className="bg-gray-850 border-b border-gray-800 px-4 py-3 flex items-center justify-between text-xs sm:text-sm text-gray-300 print:hidden z-20">
        <div className="flex items-center space-x-2">
          <EyeIcon className="h-4 w-4 text-blue-400" />
          <span className="font-medium text-white truncate max-w-xs sm:max-w-md">
            {resume.title || "Resume"}
          </span>
          <span className="bg-blue-900 text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium border border-blue-700">
            Read Only
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1 text-gray-400 text-xs">
            <ShieldCheckIcon className="h-4 w-4 text-green-400" />
            <span>Contact Privacy Protected</span>
          </div>
          <a
            href="/"
            className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
          >
            Create Your Own Resume
          </a>
        </div>
      </header>

      {/* Main Preview Area */}
      <main className="flex-1 overflow-auto">
        <ResumePreview resume={resume} readOnly={true} />
      </main>
    </div>
  );
};

export default PublicResumeView;
