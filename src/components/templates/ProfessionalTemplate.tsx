import React from 'react';
import { IResume, ISection, SectionType } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';

interface TemplateProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
}

export const ProfessionalTemplate: React.FC<TemplateProps> = ({ resume, onChange, readOnly = false }) => {
  const updateBasics = (field: string, value: string) => {
    if (!onChange || readOnly) return;
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
    if (!onChange || readOnly) return;
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
          <div key={item.id} className="mb-5">
            {section.type === SectionType.EDUCATION ? (
              <div className="flex justify-between items-start">
                <div className="w-3/4">
                  <InlineEdit value={item.degree} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'degree', v)} readOnly={readOnly} textClassName="text-md font-bold text-gray-800 font-serif" />
                  <InlineEdit value={item.field} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'field', v)} readOnly={readOnly} textClassName="text-sm text-gray-700 italic" />
                  <InlineEdit value={item.description || ''} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'description', v)} readOnly={readOnly} multiline textClassName="text-sm text-gray-600 mt-2 block" />
                </div>
                <div className="w-1/4 text-right">
                  <p className="text-xs text-gray-500 font-medium">
                    {item?.startDate?.month || ""} {item?.startDate?.year ?? ""} - {item?.endDate?.month || "Present"} {item?.endDate?.year || ""}
                  </p>
                </div>
              </div>
            ) : section.type === SectionType.WORK ? (
              <div className="flex justify-between items-start">
                <div className="w-3/4">
                  <InlineEdit value={item.position} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'position', v)} readOnly={readOnly} textClassName="text-md font-bold text-gray-800 font-serif" />
                  <InlineEdit value={item.name} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'name', v)} readOnly={readOnly} textClassName="text-sm font-semibold text-gray-700 uppercase" />
                  <InlineEdit value={item.description || ''} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'description', v)} readOnly={readOnly} multiline textClassName="text-sm text-gray-600 mt-2 block" />
                </div>
                <div className="w-1/4 text-right">
                  <span className="text-xs text-gray-500 font-medium">{item.startDate} - {item.endDate || "Present"}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                <InlineEdit value={item.title || item.name || item.institution || item.company || item.degree || "Untitled Item"} 
                            onChange={readOnly ? undefined : (v) => {
                              const key = item.title !== undefined ? 'title' : item.name !== undefined ? 'name' : item.institution !== undefined ? 'institution' : item.company !== undefined ? 'company' : item.degree !== undefined ? 'degree' : 'name';
                              updateSectionItem(section.id, item.id, key, v);
                            }}
                            readOnly={readOnly} />
                {item.description && <InlineEdit value={item.description} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'description', v)} readOnly={readOnly} multiline textClassName="text-sm text-gray-600 mt-1 block" />}
              </div>
            )}
          </div>
        );
      });
    } else {
      return <div className="text-sm text-gray-700">{section.content as any}</div>;
    }
  };

  const formattedAddress = [
    resume.content.basics.location?.address,
    resume.content.basics.location?.city,
    resume.content.basics.location?.countryCode
  ].filter(Boolean).join(', ') || resume.content.basics.location?.address;

  return (
    <div className="p-[2cm] h-full print:p-8 mt-5 font-serif bg-slate-50">
      {/* Header */}
      <div className="flex justify-between items-end mb-8 border-b-[3px] border-slate-800 pb-4">
        <div>
          <InlineEdit 
            value={resume.content.basics.name || ""} 
            onChange={readOnly ? undefined : (v) => updateBasics('name', v)} 
            textClassName="text-5xl font-black text-slate-800 tracking-tight" 
            placeholder="Your Name"
            readOnly={readOnly}
          />
          <InlineEdit 
            value={resume.content.basics.label || ""} 
            onChange={readOnly ? undefined : (v) => updateBasics('label', v)} 
            textClassName="text-xl text-slate-600 mt-1 block" 
            placeholder="Professional Title"
            readOnly={readOnly}
          />
        </div>
        <div className="text-sm text-slate-600 text-right space-y-1">
          {(resume.content.basics.email || !readOnly) && (
            <InlineEdit 
              value={resume.content.basics.email || ""} 
              onChange={readOnly ? undefined : (v) => updateBasics('email', v)} 
              placeholder="Email Address"
              textClassName="block"
              readOnly={readOnly}
            />
          )}
          {(resume.content.basics.phone || !readOnly) && (
            <InlineEdit 
              value={resume.content.basics.phone || ""} 
              onChange={readOnly ? undefined : (v) => updateBasics('phone', v)} 
              placeholder="Phone Number"
              textClassName="block"
              readOnly={readOnly}
            />
          )}
          {formattedAddress && (
            <span className="block text-slate-600">{formattedAddress}</span>
          )}
        </div>
      </div>

      {/* Summary */}
      {resume.content.basics.summary !== undefined && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-widest border-b border-slate-300 mb-3 pb-1">
            Profile
          </h2>
          <InlineEdit 
            value={resume.content.basics.summary} 
            onChange={readOnly ? undefined : (v) => updateBasics('summary', v)} 
            multiline 
            textClassName="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words block" 
            placeholder="A brief summary of your professional background..."
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Sections */}
      {(resume.content.sectionOrder || []).map((sectionId) => {
        const section = (resume.content.sections || []).find((s) => s.id === sectionId);
        if (!section || section.enabled) return null;

        return (
          <div key={section.id} className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-widest border-b border-slate-300 mb-3 pb-1">
              {section.title}
            </h2>
            {renderSectionContent(section)}
          </div>
        );
      })}
    </div>
  );
};
