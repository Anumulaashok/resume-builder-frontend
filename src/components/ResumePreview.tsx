import React, { useState } from "react";
import { EducationItem, IResume } from "../types/resume";
import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "@heroicons/react/24/outline";

interface ResumePreviewProps {
  resume: IResume;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ resume }) => {
  const [scale, setScale] = useState(1);

  const handlePrint = () => {
    window.print();
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.1, 2));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  const renderSectionContent = (section: any) => {
    if (Array.isArray(section.content)) {
      return section.content.map((item: any) => (
        <div key={item.id} className="mb-4">
          {section.type === "EducationItem" ? (
            renderEducationItem(item)
          ) : (
            <div className="text-sm text-gray-700">
              {item.title ||
                item.name ||
                item.institution ||
                item.company ||
                item.degree ||
                "Untitled Item"}
            </div>
          )}
        </div>
      ));
    } else {
      return <div className="text-sm text-gray-700">{section.content}</div>;
    }
  };

  const renderEducationItem = (item: EducationItem) => {
    if (item.enabled) return null;
    return (
      <div key={item.id} className="mb-4">
        <h3 className="text-md font-semibold text-gray-900">{item.degree}</h3>
        <p className="text-sm text-gray-600">{item.field}</p>
        <p className="text-xs text-gray-500">
          {item?.startDate?.month || ""} - {item?.startDate?.year ?? ""} -{" "}
          {item?.endDate?.month || "Present"} -{item?.endDate?.year || ""}
        </p>
        <p className="text-xs text-gray-500">{item?.description}</p>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 h-full overflow-auto p-4 sm:p-8">
      <div
        className="w-full lg:w-[21cm] mx-auto bg-white shadow-xl min-h-[29.7cm] relative print:shadow-none"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          marginBottom: `${(scale - 1) * 100}%`,
        }}
      >
        {/* Preview Controls */}
        <div className="absolute -top-12 left-0 right-0 flex justify-center space-x-4 print:hidden  mt-3">
          <button
            onClick={handleZoomOut}
            className="px-3 py-1.5 text-sm bg-white rounded-md shadow text-gray-600 hover:text-gray-900 hover:shadow-md transition-all"
          >
            <MagnifyingGlassMinusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-3 py-1.5 text-sm bg-white rounded-md shadow text-gray-600 hover:text-gray-900 hover:shadow-md transition-all whitespace-nowrap"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="px-3 py-1.5 text-sm bg-white rounded-md shadow text-gray-600 hover:text-gray-900 hover:shadow-md transition-all"
          >
            <MagnifyingGlassPlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-sm bg-white rounded-md shadow text-gray-600 hover:text-gray-900 hover:shadow-md transition-all"
          >
            Print
          </button>
        </div>

        {/* Resume Content */}
        <div className="p-[2cm] h-full print:p-8 mt-5 ">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {resume.content.basics.name}
            </h1>
            <p className="text-lg text-gray-600 mt-1">
              {resume.content.basics.label}
            </p>
            <div className="text-sm text-gray-500 mt-2 space-x-3">
              {resume.content.basics.email && (
                <span>{resume.content.basics.email}</span>
              )}
              {resume.content.basics.phone && (
                <span>• {resume.content.basics.phone}</span>
              )}
            </div>
          </div>

          {/* Summary */}
          {resume.content.basics.summary && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                Professional Summary
              </h2>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {resume.content.basics.summary}
              </p>
            </div>
          )}

          {/* Sections */}
          {resume.content.sectionOrder.map((sectionId) => {
            const section = resume.content.sections.find(
              (s) => s.id === sectionId
            );
            if (!section) return null;

            return (
              <div key={section.id} className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                  {section.title}
                </h2>
                {renderSectionContent(section)}
                {/* <div className="text-sm text-gray-700">
                  {Array.isArray(section.content) ? (
                    <ul className="list-disc list-inside space-y-2">
                      {section.content.map((item, index) => (
                        <li key={index}>{JSON.stringify(item)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{JSON.stringify(section.content)}</p>
                  )}
                </div> */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
