import React, { createContext, useContext } from 'react';
import { IResume } from '../../../types/resume';
import { DateFormatPattern } from '../templateHelpers';

export type HeadingStyleVariant = 'underline' | 'bar' | 'caps' | 'pill' | 'side-label';
export type SkillStyleVariant = 'chips' | 'comma' | 'bars' | 'dots' | 'columns';

export interface TemplateContextValue {
  resume?: IResume;
  readOnly: boolean;
  onChange?: (resume: IResume) => void;
  updateBasics: (field: string, value: string) => void;
  updateSectionItem: (
    sectionId: string,
    itemId: string,
    field: string,
    value: string
  ) => void;
  updateSectionItemPatch: (
    sectionId: string,
    itemId: string,
    patch: Record<string, any>
  ) => void;
  headingStyle: HeadingStyleVariant;
  skillStyle: SkillStyleVariant;
  dateFormat?: DateFormatPattern;
}

const noop = () => {};

const defaultContextValue: TemplateContextValue = {
  resume: undefined,
  readOnly: true,
  onChange: undefined,
  updateBasics: noop,
  updateSectionItem: noop,
  updateSectionItemPatch: noop,
  headingStyle: 'underline',
  skillStyle: 'chips',
  dateFormat: undefined,
};

export const TemplateContext = createContext<TemplateContextValue>(defaultContextValue);

export interface TemplateProviderProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
  defaultHeadingStyle?: HeadingStyleVariant;
  defaultSkillStyle?: SkillStyleVariant;
  children: React.ReactNode;
}

export function applyBasicsFieldUpdate(
  basics: IResume['content']['basics'] | undefined,
  field: string,
  value: string
): IResume['content']['basics'] {
  const current = basics || {};

  if (field === 'location') {
    const parts = value
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const prevLoc = current.location || {};
    let nextLocation: NonNullable<IResume['content']['basics']['location']>;

    if (parts.length === 0) {
      nextLocation = {
        ...prevLoc,
        address: '',
        city: '',
        region: '',
        countryCode: '',
        postalCode: '',
      };
    } else if (parts.length === 1) {
      nextLocation = {
        ...prevLoc,
        address: '',
        city: parts[0],
        region: '',
        countryCode: '',
      };
    } else if (parts.length === 2) {
      nextLocation = {
        ...prevLoc,
        address: '',
        city: parts[0],
        region: parts[1],
        countryCode: '',
      };
    } else if (parts.length === 3) {
      nextLocation = {
        ...prevLoc,
        address: '',
        city: parts[0],
        region: parts[1],
        countryCode: parts[2],
      };
    } else {
      nextLocation = {
        ...prevLoc,
        address: parts.slice(0, -3).join(', '),
        city: parts[parts.length - 3],
        region: parts[parts.length - 2],
        countryCode: parts[parts.length - 1],
      };
    }

    return {
      ...current,
      location: nextLocation,
    };
  }

  if (field === 'url' || field === 'website') {
    const nextBasics: IResume['content']['basics'] = {
      ...current,
      url: value,
    };
    if (Object.prototype.hasOwnProperty.call(current, 'website')) {
      nextBasics.website = value;
    }
    if (Object.prototype.hasOwnProperty.call(current, 'portfolioUrl')) {
      nextBasics.portfolioUrl = value;
    }
    return nextBasics;
  }

  if (field === 'profile:new') {
    const trimmed = value.trim();
    if (!trimmed) return current;
    return {
      ...current,
      profiles: [
        ...(Array.isArray(current.profiles) ? current.profiles : []),
        { network: '', username: '', url: trimmed },
      ],
    };
  }

  if (field.startsWith('profile:')) {
    const idx = Number.parseInt(field.slice('profile:'.length), 10);
    if (Number.isNaN(idx) || idx < 0) return current;
    const existingProfiles = Array.isArray(current.profiles)
      ? [...current.profiles]
      : [];
    const trimmed = value.trim();
    const target = existingProfiles[idx] || {};
    if (!trimmed && !target.network?.trim() && !target.username?.trim()) {
      existingProfiles.splice(idx, 1);
    } else {
      existingProfiles[idx] = { ...target, url: trimmed };
    }
    return {
      ...current,
      profiles: existingProfiles,
    };
  }

  return {
    ...current,
    [field]: value,
  };
}

export const TemplateProvider: React.FC<TemplateProviderProps> = ({
  resume,
  onChange,
  readOnly = false,
  defaultHeadingStyle = 'underline',
  defaultSkillStyle = 'chips',
  children,
}) => {
  const effectiveReadOnly = Boolean(readOnly || !onChange);

  const updateBasics = (field: string, value: string) => {
    if (effectiveReadOnly || !onChange) return;
    onChange({
      ...resume,
      content: {
        ...resume.content,
        basics: applyBasicsFieldUpdate(resume.content?.basics, field, value),
      },
    });
  };

  const updateSectionItemPatch = (
    sectionId: string,
    itemId: string,
    patch: Record<string, any>
  ) => {
    if (effectiveReadOnly || !onChange) return;
    onChange({
      ...resume,
      content: {
        ...resume.content,
        sections: (resume.content?.sections || []).map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                content: Array.isArray(sec.content)
                  ? sec.content.map((item) =>
                      item && item.id === itemId ? { ...item, ...patch } : item
                    )
                  : sec.content,
              }
            : sec
        ),
      },
    });
  };

  const updateSectionItem = (
    sectionId: string,
    itemId: string,
    field: string,
    value: string
  ) => {
    updateSectionItemPatch(sectionId, itemId, { [field]: value });
  };

  const headingStyle: HeadingStyleVariant =
    resume.themeConfig?.headingStyle || defaultHeadingStyle;
  const skillStyle: SkillStyleVariant =
    resume.themeConfig?.skillStyle || defaultSkillStyle;
  const dateFormat: DateFormatPattern | undefined = resume.themeConfig?.dateFormat;

  return (
    <TemplateContext.Provider
      value={{
        resume,
        readOnly: effectiveReadOnly,
        onChange,
        updateBasics,
        updateSectionItem,
        updateSectionItemPatch,
        headingStyle,
        skillStyle,
        dateFormat,
      }}
    >
      {children}
    </TemplateContext.Provider>
  );
};

export function useTemplateContext(): TemplateContextValue {
  return useContext(TemplateContext);
}
