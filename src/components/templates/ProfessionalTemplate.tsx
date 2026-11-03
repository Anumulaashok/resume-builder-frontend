import React from 'react';
import { IResume, ISection, SectionType } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';

interface TemplateProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
}

export const ProfessionalTemplate: React.FC<TemplateProps> = ({ resume, onChange }) => {
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
          <div key={item.id} style={{ marginBottom: 'var(--theme-item-spacing, 1.25rem)' }}>
            {section.type === SectionType.EDUCATION ? (
              <div className="flex justify-between items-start">
                <div className="w-3/4">
                  <InlineEdit 
                    value={item.degree} 
                    onChange={(v) => updateSectionItem(section.id, item.id, 'degree', v)} 
                    textClassName="text-md font-bold" 
                    style={{ fontFamily: 'var(--theme-heading-font)', color: 'var(--theme-heading-color, #1e293b)' }}
                  />
                  <InlineEdit value={item.field} onChange={(v) => updateSectionItem(section.id, item.id, 'field', v)} textClassName="text-sm text-gray-700 italic" />
                  <InlineEdit value={item.description || ''} onChange={(v) => updateSectionItem(section.id, item.id, 'description', v)} multiline textClassName="text-sm text-gray-600 mt-2 block" />
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
                  <InlineEdit 
                    value={item.position} 
                    onChange={(v) => updateSectionItem(section.id, item.id, 'position', v)} 
                    textClassName="text-md font-bold" 
                    style={{ fontFamily: 'var(--theme-heading-font)', color: 'var(--theme-heading-color, #1e293b)' }}
                  />
                  <InlineEdit value={item.name} onChange={(v) => updateSectionItem(section.id, item.id, 'name', v)} textClassName="text-sm font-semibold text-gray-700 uppercase" />
                  <InlineEdit value={item.description || ''} onChange={(v) => updateSectionItem(section.id, item.id, 'description', v)} multiline textClassName="text-sm text-gray-600 mt-2 block" />
                </div>
                <div className="w-1/4 text-right">
                  <span className="text-xs text-gray-500 font-medium">{item.startDate} - {item.endDate || "Present"}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                <InlineEdit 
                  value={item.title || item.name || item.institution || item.company || item.degree || "Untitled Item"} 
                  onChange={(v) => {
                    const key = item.title !== undefined ? 'title' : item.name !== undefined ? 'name' : item.institution !== undefined ? 'institution' : item.company !== undefined ? 'company' : item.degree !== undefined ? 'degree' : 'name';
                    updateSectionItem(section.id, item.id, key, v);
                  }} 
                  style={{ fontFamily: 'var(--theme-heading-font)', color: 'var(--theme-heading-color, #1e293b)' }}
                />
                {item.description && <InlineEdit value={item.description} onChange={(v) => updateSectionItem(section.id, item.id, 'description', v)} multiline textClassName="text-sm text-gray-600 mt-1 block" />}
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
    <div className="p-[2cm] h-full print:p-8 mt-5 bg-slate-50" style={{ fontFamily: 'var(--theme-body-font, serif)', color: 'var(--theme-text-color, #334155)' }}>
      {/* Header */}
      <div 
        className="flex justify-between items-end border-b-[3px] pb-4"
        style={{ 
          borderColor: 'var(--theme-primary, #1e293b)',
          marginBottom: 'var(--theme-section-spacing, 2rem)'
        }}
      >
        <div>
          <InlineEdit 
            value={resume.content.basics.name || ""} 
            onChange={(v) => updateBasics('name', v)} 
            textClassName="text-5xl font-black tracking-tight" 
            style={{ fontFamily: 'var(--theme-heading-font)', color: 'var(--theme-heading-color, #1e293b)' }}
            placeholder="Your Name"
          />
          <InlineEdit 
            value={resume.content.basics.label || ""} 
            onChange={(v) => updateBasics('label', v)} 
            textClassName="text-xl mt-1 block font-medium" 
            style={{ color: 'var(--theme-primary, #475569)' }}
            placeholder="Professional Title"
          />
        </div>
        <div className="text-sm text-slate-600 text-right space-y-1">
          <InlineEdit 
            value={resume.content.basics.email || ""} 
            onChange={(v) => updateBasics('email', v)} 
            placeholder="Email Address"
            textClassName="block"
          />
          <InlineEdit 
            value={resume.content.basics.phone || ""} 
            onChange={(v) => updateBasics('phone', v)} 
            placeholder="Phone Number"
            textClassName="block"
          />
        </div>
      </div>

      {/* Summary */}
      {resume.content.basics.summary !== undefined && (
        <div style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}>
          <h2 
            className="text-lg font-bold uppercase tracking-widest border-b pb-1 mb-3"
            style={{ 
              fontFamily: 'var(--theme-heading-font)',
              color: 'var(--theme-primary, #1e293b)',
              borderBottomColor: 'var(--theme-primary, #cbd5e1)'
            }}
          >
            Profile
          </h2>
          <InlineEdit 
            value={resume.content.basics.summary} 
            onChange={(v) => updateBasics('summary', v)} 
            multiline 
            textClassName="text-sm leading-relaxed whitespace-pre-wrap break-words block" 
            style={{ color: 'var(--theme-text-color, #334155)' }}
            placeholder="A brief summary of your professional background..."
          />
        </div>
      )}

      {/* Sections */}
      {resume.content.sectionOrder.map((sectionId) => {
        const section = resume.content.sections.find((s) => s.id === sectionId);
        if (!section || section.enabled) return null;

        return (
          <div key={section.id} style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}>
            <h2 
              className="text-lg font-bold uppercase tracking-widest border-b pb-1 mb-3"
              style={{ 
                fontFamily: 'var(--theme-heading-font)',
                color: 'var(--theme-primary, #1e293b)',
                borderBottomColor: 'var(--theme-primary, #cbd5e1)'
              }}
            >
              {section.title}
            </h2>
            {renderSectionContent(section)}
          </div>
        );
      })}
    </div>
  );
};
