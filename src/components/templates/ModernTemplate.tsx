import React from 'react';
import { IResume, ISection, SectionType } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';

interface TemplateProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
}

export const ModernTemplate: React.FC<TemplateProps> = ({ resume, onChange, readOnly = false }) => {
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
          <div key={item.id} style={{ marginBottom: 'var(--theme-item-spacing, 1rem)' }}>
            {section.type === SectionType.EDUCATION ? (
              <>
                <InlineEdit 
                  value={item.degree} 
                  onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'degree', v)} 
                  readOnly={readOnly}
                  textClassName="text-md font-semibold"
                  style={{ fontFamily: 'var(--theme-heading-font)', color: 'var(--theme-heading-color, #111827)' }}
                />
                <InlineEdit value={item.field} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'field', v)} readOnly={readOnly} textClassName="text-sm text-gray-600" />
                <p className="text-xs text-gray-500">
                  {item?.startDate?.month || ""} - {item?.startDate?.year ?? ""} -{" "}
                  {item?.endDate?.month || "Present"} -{item?.endDate?.year || ""}
                </p>
                <InlineEdit value={item.description || ''} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'description', v)} readOnly={readOnly} multiline textClassName="text-xs text-gray-500" />
              </>
            ) : section.type === SectionType.WORK ? (
              <>
                <div className="flex justify-between items-baseline">
                  <InlineEdit 
                    value={item.position} 
                    onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'position', v)} 
                    readOnly={readOnly}
                    textClassName="text-md font-semibold"
                    style={{ fontFamily: 'var(--theme-heading-font)', color: 'var(--theme-heading-color, #111827)' }}
                  />
                  <span className="text-xs text-gray-500">{item.startDate} - {item.endDate || "Present"}</span>
                </div>
                <InlineEdit value={item.name} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'name', v)} readOnly={readOnly} textClassName="text-sm font-medium text-gray-700" />
                <InlineEdit value={item.description || ''} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'description', v)} readOnly={readOnly} multiline textClassName="text-sm text-gray-600 mt-1" />
              </>
            ) : (
              <div className="text-sm text-gray-700">
                <InlineEdit 
                  value={item.title || item.name || item.institution || item.company || item.degree || "Untitled Item"} 
                  onChange={readOnly ? undefined : (v) => {
                    const key = item.title !== undefined ? 'title' : item.name !== undefined ? 'name' : item.institution !== undefined ? 'institution' : item.company !== undefined ? 'company' : item.degree !== undefined ? 'degree' : 'name';
                    updateSectionItem(section.id, item.id, key, v);
                  }}
                  readOnly={readOnly}
                  style={{ fontFamily: 'var(--theme-heading-font)', color: 'var(--theme-heading-color, #111827)' }}
                />
                {item.description && <InlineEdit value={item.description} onChange={readOnly ? undefined : (v) => updateSectionItem(section.id, item.id, 'description', v)} readOnly={readOnly} multiline textClassName="text-xs text-gray-500 mt-1" />}
              </div>
            )}
          </div>
        );
      });
    } else {
      return <div className="text-sm text-gray-700">{section.content as any}</div>;
    }
  };

  const isEmailHidden = readOnly && Boolean(
    resume.sharing?.privacy?.hideEmail || resume.sharing?.privacySettings?.hideEmail
  );
  const isPhoneHidden = readOnly && Boolean(
    resume.sharing?.privacy?.hidePhone || resume.sharing?.privacySettings?.hidePhone
  );
  const isAddressHidden = readOnly && Boolean(
    resume.sharing?.privacy?.hideAddress || resume.sharing?.privacySettings?.hideAddress
  );

  const contactItems: React.ReactNode[] = [];
  if (!isEmailHidden && (resume.content.basics.email || !readOnly)) {
    contactItems.push(
      <InlineEdit 
        key="email"
        value={resume.content.basics.email || ""} 
        onChange={readOnly ? undefined : (v) => updateBasics('email', v)} 
        placeholder="Email Address"
        readOnly={readOnly}
      />
    );
  }
  if (!isPhoneHidden && (resume.content.basics.phone || !readOnly)) {
    contactItems.push(
      <InlineEdit 
        key="phone"
        value={resume.content.basics.phone || ""} 
        onChange={readOnly ? undefined : (v) => updateBasics('phone', v)} 
        placeholder="Phone Number"
        readOnly={readOnly}
      />
    );
  }
  const formattedAddress = [
    !isAddressHidden ? resume.content.basics.location?.address : undefined,
    resume.content.basics.location?.city,
    resume.content.basics.location?.countryCode
  ].filter(Boolean).join(', ') || (!isAddressHidden ? resume.content.basics.location?.address : undefined);

  if (formattedAddress) {
    contactItems.push(
      <span key="address">{formattedAddress}</span>
    );
  }

  return (
    <div className="p-[2cm] h-full print:p-8 mt-5" style={{ fontFamily: 'var(--theme-body-font, inherit)', color: 'var(--theme-text-color, #374151)' }}>
      {/* Header */}
      <div 
        className="text-center pb-6 border-b-2"
        style={{ 
          borderColor: 'var(--theme-primary, #111827)',
          marginBottom: 'var(--theme-section-spacing, 2rem)'
        }}
      >
        <InlineEdit 
          value={resume.content.basics.name || ""} 
          onChange={readOnly ? undefined : (v) => updateBasics('name', v)} 
          readOnly={readOnly}
          textClassName="text-4xl font-bold tracking-tight" 
          style={{ fontFamily: 'var(--theme-heading-font)', color: 'var(--theme-heading-color, #111827)' }}
          placeholder="Your Name"
        />
        <InlineEdit 
          value={resume.content.basics.label || ""} 
          onChange={readOnly ? undefined : (v) => updateBasics('label', v)} 
          readOnly={readOnly}
          textClassName="text-xl mt-2 font-medium" 
          style={{ color: 'var(--theme-primary, #4b5563)' }}
          placeholder="Professional Title"
        />
        {contactItems.length > 0 && (
          <div className="text-sm text-gray-500 mt-3 flex flex-wrap justify-center items-center gap-x-3 gap-y-1">
            {contactItems.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span>•</span>}
                {item}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {resume.content.basics.summary !== undefined && (
        <div style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}>
          <h2 
            className="text-lg font-bold uppercase tracking-wider mb-2"
            style={{ 
              fontFamily: 'var(--theme-heading-font)',
              color: 'var(--theme-primary, #111827)'
            }}
          >
            Professional Summary
          </h2>
          <InlineEdit 
            value={resume.content.basics.summary} 
            onChange={readOnly ? undefined : (v) => updateBasics('summary', v)} 
            multiline 
            textClassName="text-sm leading-relaxed whitespace-pre-wrap break-words" 
            style={{ color: 'var(--theme-text-color, #374151)' }}
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
          <div key={section.id} style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}>
            <h2 
              className="text-lg font-bold uppercase tracking-wider mb-3"
              style={{ 
                fontFamily: 'var(--theme-heading-font)',
                color: 'var(--theme-primary, #111827)'
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
