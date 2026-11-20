import React, { createContext, useContext, useMemo } from 'react';
import { IResume } from '../../../types/resume';
import {
  ensureTemplateResumeIds,
  hasValidIdentifier,
} from '../../../utils/resumeNormalizer';
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

export const TemplateProvider: React.FC<TemplateProviderProps> = ({
  resume,
  onChange,
  readOnly = false,
  defaultHeadingStyle = 'underline',
  defaultSkillStyle = 'chips',
  children,
}) => {
  const effectiveReadOnly = Boolean(readOnly || !onChange);
  const normalizedResume = useMemo(
    () => ensureTemplateResumeIds(resume),
    [resume]
  );

  const updateBasics = (field: string, value: string) => {
    if (effectiveReadOnly || !onChange) return;
    onChange({
      ...normalizedResume,
      content: {
        ...normalizedResume.content,
        basics: {
          ...(normalizedResume.content?.basics || {}),
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
    if (!hasValidIdentifier(sectionId) || !hasValidIdentifier(itemId)) return;
    onChange({
      ...normalizedResume,
      content: {
        ...normalizedResume.content,
        sections: (normalizedResume.content?.sections || []).map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                content: Array.isArray(sec.content)
                  ? sec.content.map((item) =>
                      item && hasValidIdentifier(item.id) && item.id === itemId
                        ? { ...item, ...patch }
                        : item
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
    normalizedResume.themeConfig?.headingStyle || defaultHeadingStyle;
  const skillStyle: SkillStyleVariant =
    normalizedResume.themeConfig?.skillStyle || defaultSkillStyle;
  const dateFormat: DateFormatPattern | undefined =
    normalizedResume.themeConfig?.dateFormat;

  return (
    <TemplateContext.Provider
      value={{
        resume: normalizedResume,
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
