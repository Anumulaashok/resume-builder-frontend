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

  const updateSectionItem = (
    sectionId: string,
    itemId: string,
    field: string,
    value: string
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
                      item.id === itemId ? { ...item, [field]: value } : item
                    )
                  : sec.content,
              }
            : sec
        ),
      },
    });
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
