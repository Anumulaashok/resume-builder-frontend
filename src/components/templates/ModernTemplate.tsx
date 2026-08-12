import React from 'react';
import { IResume, ISection, SectionType } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';

interface TemplateProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
}

export const ModernTemplate: React.FC<TemplateProps> = ({ resume, onChange }) => {
  const updateBasics = (field: string, value: string) => {
    if (!onChange) return;
    onChange({
      ...resume,
      content: {
        ...resume.content,
        basics: {
          ...resume.content.basics,
          [field]: value
        }
      }
    });
  };

  const updateSectionItem = (sectionId: string, itemId: string, field: string, value: string) => {
    if (!onChange) return;
    onChange({
      ...resume,
      content: {
        ...resume.content,
        sections: resume.content.sections.map(sec => 
          sec.id === sectionId 
            ? { ...sec, content: Array.isArray(sec.content) ? sec.content.map(item => item.id === itemId ? { ...item, [field]: value } : item) : sec.content }
            : sec
        )
      }
    });
  };

  const renderSectionContent = (section: ISection) => {
    if (Array.isArray(section.content)) {
      return section.content.map((item: any) => {
        if (item.enabled) return null;
        
        return (
          <div key={item.id} className="mb-4">
            {section.type === SectionType.EDUCATION ? (
              <>
                <InlineEdit value={item.degree} onChange={(v) => updateSectionItem(section.id, item.id, 'degree', v)} textClassName="text-md font-semibold text-gray-900" />
                <InlineEdit value={item.field} onChange={(v) => updateSectionItem(section.id, item.id, 'field', v)} textClassName="text-sm text-gray-600" />
                <p className="text-xs text-gray-500">
                  {item?.startDate?.month || ""} - {item?.startDate?.year ?? ""} -{" "}
                  {item?.endDate?.month || "Present"} -{item?.endDate?.year || ""}
                </p>
                <InlineEdit value={item.description || ''} onChange={(v) => updateSectionItem(section.id, item.id, 'description', v)} multiline textClassName="text-xs text-gray-500" />
              </>
            ) : section.type === SectionType.WORK ? (
              <>
                <div className="flex justify-between items-baseline">
                  <InlineEdit value={item.position} onChange={(v) => updateSectionItem(section.id, item.id, 'position', v)} textClassName="text-md font-semibold text-gray-900" />
                  <span className="text-xs text-gray-500">{item.startDate} - {item.endDate || "Present"}</span>
                </div>
                <InlineEdit value={item.name} onChange={(v) => updateSectionItem(section.id, item.id, 'name', v)} textClassName="text-sm font-medium text-gray-700" />
                <InlineEdit value={item.description || ''} onChange={(v) => updateSectionItem(section.id, item.id, 'description', v)} multiline textClassName="text-sm text-gray-600 mt-1" />
              </>
            ) : (
              <div className="text-sm text-gray-700">
                <InlineEdit value={item.title || item.name || item.institution || item.company || item.degree || "Untitled Item"} 
                            onChange={(v) => {
                              const key = item.title !== undefined ? 'title' : item.name !== undefined ? 'name' : item.institution !== undefined ? 'institution' : item.company !== undefined ? 'company' : item.degree !== undefined ? 'degree' : 'name';
                              updateSectionItem(section.id, item.id, key, v);
                            }} />
                {item.description && <InlineEdit value={item.description} onChange={(v) => updateSectionItem(section.id, item.id, 'description', v)} multiline textClassName="text-xs text-gray-500 mt-1" />}
              </div>
            )}
          </div>
        );
      });
    } else {
      return <div className="text-sm text-gray-700">{section.content as any}</div>;
    }
  };

  return (
    <div className="p-[2cm] h-full print:p-8 mt-5">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-900 pb-6">
        <InlineEdit 
          value={resume.content.basics.name || ""} 
          onChange={(v) => updateBasics('name', v)} 
          textClassName="text-4xl font-bold text-gray-900 tracking-tight" 
          placeholder="Your Name"
        />
        <InlineEdit 
          value={resume.content.basics.label || ""} 
          onChange={(v) => updateBasics('label', v)} 
          textClassName="text-xl text-gray-600 mt-2 font-medium" 
          placeholder="Professional Title"
        />
        <div className="text-sm text-gray-500 mt-3 space-x-3 flex justify-center items-center">
          <InlineEdit 
            value={resume.content.basics.email || ""} 
            onChange={(v) => updateBasics('email', v)} 
            placeholder="Email Address"
          />
          <span>•</span>
          <InlineEdit 
            value={resume.content.basics.phone || ""} 
            onChange={(v) => updateBasics('phone', v)} 
            placeholder="Phone Number"
          />
        </div>
      </div>

      {/* Summary */}
      {resume.content.basics.summary !== undefined && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wider mb-2">
            Professional Summary
          </h2>
          <InlineEdit 
            value={resume.content.basics.summary} 
            onChange={(v) => updateBasics('summary', v)} 
            multiline 
            textClassName="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words" 
            placeholder="A brief summary of your professional background..."
          />
        </div>
      )}

      {/* Sections */}
      {resume.content.sectionOrder.map((sectionId) => {
        const section = resume.content.sections.find((s) => s.id === sectionId);
        if (!section || section.enabled) return null;

        return (
          <div key={section.id} className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wider mb-3">
              {section.title}
            </h2>
            {renderSectionContent(section)}
          </div>
        );
      })}
    </div>
  );
};
