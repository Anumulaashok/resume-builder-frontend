import React, { createContext, useContext } from 'react';
import { IResume, ThemePhotoConfig } from '../../../types/resume';
import { defaultPhotoConfig, resolvePhotoConfig } from '../../../constants/themeConstants';
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
  atsMode: boolean;
  photoConfig: ThemePhotoConfig;
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
  atsMode: false,
  photoConfig: defaultPhotoConfig,
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
        basics: {
          ...(resume.content?.basics || {}),
          [field]: value,
        },
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

  const atsMode = Boolean(resume.themeConfig?.atsMode);
  const photoConfig = resolvePhotoConfig(resume.themeConfig?.photo);
  const headingStyle: HeadingStyleVariant = atsMode
    ? 'underline'
    : resume.themeConfig?.headingStyle || defaultHeadingStyle;
  const skillStyle: SkillStyleVariant = atsMode
    ? 'comma'
    : resume.themeConfig?.skillStyle || defaultSkillStyle;
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
        atsMode,
        photoConfig,
      }}
    >
      {children}
    </TemplateContext.Provider>
  );
};

export function useTemplateContext(): TemplateContextValue {
  return useContext(TemplateContext);
}
