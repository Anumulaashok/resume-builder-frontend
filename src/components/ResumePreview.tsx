import React, { useState } from "react";
import { IResume } from "../types/resume";
import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";
import { ModernTemplate } from "./templates/ModernTemplate";
import { ProfessionalTemplate } from "./templates/ProfessionalTemplate";
import { motion } from "framer-motion";

interface ResumePreviewProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
}

const templates = [
  { id: 'modern', name: 'Modern', component: ModernTemplate },
  { id: 'professional', name: 'Professional', component: ProfessionalTemplate },
];

const ResumePreview: React.FC<ResumePreviewProps> = ({ resume, onChange }) => {
  const [scale, setScale] = useState(1);
  const [activeTemplateId, setActiveTemplateId] = useState('modern');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

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

  const ActiveTemplateComponent = templates.find(t => t.id === activeTemplateId)?.component || ModernTemplate;

  return (
    <div className="bg-gray-800 h-full overflow-auto p-4 sm:p-8 relative transition-colors duration-300">
      
      {/* Template Selector Overlay */}
      {showTemplateSelector && (
        <div className="absolute top-4 left-4 z-20 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 w-64 print:hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-medium">Select Template</h3>
            <button onClick={() => setShowTemplateSelector(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="space-y-2">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveTemplateId(t.id); setShowTemplateSelector(false); }}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors ${activeTemplateId === t.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="w-full lg:w-[21cm] mx-auto bg-white shadow-2xl min-h-[29.7cm] relative print:shadow-none transition-all duration-300"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          marginBottom: `${(scale - 1) * 100}%`,
        }}
      >
        {/* Preview Controls */}
        <div className="absolute -top-14 left-0 right-0 flex justify-center space-x-4 print:hidden mt-3 z-10">
          <button
            onClick={() => setShowTemplateSelector(!showTemplateSelector)}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md shadow text-gray-300 hover:text-white hover:bg-gray-700 transition-all flex items-center gap-2"
          >
            <SwatchIcon className="h-4 w-4" />
            Templates
          </button>
          <button
            onClick={handleZoomOut}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md shadow text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
          >
            <MagnifyingGlassMinusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md shadow text-gray-300 hover:text-white hover:bg-gray-700 transition-all whitespace-nowrap"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md shadow text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
          >
            <MagnifyingGlassPlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 text-sm bg-blue-600 rounded-md shadow text-white hover:bg-blue-700 transition-all"
          >
            Print
          </button>
        </div>

        {/* Resume Content Wrapper */}
        <motion.div 
          key={activeTemplateId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="h-full"
        >
          <ActiveTemplateComponent resume={resume} onChange={onChange} />
        </motion.div>
      </div>
    </div>
  );
};

export default ResumePreview;
