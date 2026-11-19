import React from 'react';
import { IResume, ThemeConfig } from '../../types/resume';
import { fontPairingOptions } from '../../constants/themeConstants';
import {
  TemplateCategory,
  TemplateLayout,
  TemplateMetadata,
  templateMetadataRegistry,
} from '../../constants/templateMetadata';
import { ModernTemplate } from './ModernTemplate';
import { ProfessionalTemplate } from './ProfessionalTemplate';
import { MinimalTemplate } from './MinimalTemplate';
import { TechSplitTemplate } from './TechSplitTemplate';
import { CreativeSidebarTemplate } from './CreativeSidebarTemplate';
import { ExecutiveTwoColumnTemplate } from './ExecutiveTwoColumnTemplate';
import { ClassicTemplate } from './ClassicTemplate';
import { ExecutiveTemplate } from './ExecutiveTemplate';
import { CompactTemplate } from './CompactTemplate';
import { TimelineTemplate } from './TimelineTemplate';
import { BoldHeaderTemplate } from './BoldHeaderTemplate';
import { ElegantTemplate } from './ElegantTemplate';
import { AccentSidebarTemplate } from './AccentSidebarTemplate';
import { BandedTemplate } from './BandedTemplate';
import { DeveloperTemplate } from './DeveloperTemplate';
import { StartupTemplate } from './StartupTemplate';
import { AcademicTemplate } from './AcademicTemplate';

export type { TemplateCategory, TemplateLayout };

export interface TemplateComponentProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
}

export interface TemplateDefinition extends TemplateMetadata {
  component: React.ComponentType<TemplateComponentProps>;
}

const TEMPLATE_COMPONENTS: Record<
  string,
  React.ComponentType<TemplateComponentProps>
> = {
  modern: ModernTemplate,
  professional: ProfessionalTemplate,
  minimal: MinimalTemplate,
  'tech-split': TechSplitTemplate,
  'creative-sidebar': CreativeSidebarTemplate,
  'two-column': ExecutiveTwoColumnTemplate,
  classic: ClassicTemplate,
  executive: ExecutiveTemplate,
  compact: CompactTemplate,
  timeline: TimelineTemplate,
  'bold-header': BoldHeaderTemplate,
  elegant: ElegantTemplate,
  'accent-sidebar': AccentSidebarTemplate,
  banded: BandedTemplate,
  developer: DeveloperTemplate,
  startup: StartupTemplate,
  academic: AcademicTemplate,
};

export const templateRegistry: TemplateDefinition[] =
  templateMetadataRegistry.map((meta) => ({
    ...meta,
    component: TEMPLATE_COMPONENTS[meta.id] || ModernTemplate,
  }));

export function getTemplate(id?: string | null): TemplateDefinition {
  const fallback =
    templateRegistry.find((t) => t.id === 'modern') || templateRegistry[0];
  if (!id || typeof id !== 'string') {
    return fallback;
  }
  const normalized = id.trim().toLowerCase();
  return (
    templateRegistry.find((t) => t.id.toLowerCase() === normalized) || fallback
  );
}

export function mergeTemplateTheme(
  currentTheme: ThemeConfig | undefined,
  previousTemplateDefaults: Partial<ThemeConfig> | undefined,
  nextTemplateDefaults: Partial<ThemeConfig>,
  explicitlyCustomisedKeys?: ReadonlySet<keyof ThemeConfig>
): ThemeConfig {
  const merged: ThemeConfig = { ...nextTemplateDefaults };

  if (merged.fontPairingId && !merged.headingFont && !merged.bodyFont) {
    const nextPairing = fontPairingOptions.find((f) => f.id === merged.fontPairingId);
    if (nextPairing) {
      merged.headingFont = nextPairing.headingFont;
      merged.bodyFont = nextPairing.bodyFont;
    }
  }

  if (!currentTheme) {
    return merged;
  }

  const prevResolved: Partial<ThemeConfig> = { ...(previousTemplateDefaults || {}) };
  if (prevResolved.fontPairingId && !prevResolved.headingFont && !prevResolved.bodyFont) {
    const prevPairing = fontPairingOptions.find((f) => f.id === prevResolved.fontPairingId);
    if (prevPairing) {
      prevResolved.headingFont = prevPairing.headingFont;
      prevResolved.bodyFont = prevPairing.bodyFont;
    }
  }

  (Object.keys(currentTheme) as Array<keyof ThemeConfig>).forEach((key) => {
    const val = currentTheme[key];
    if (val === undefined) return;

    const matchesPrevDefault =
      prevResolved[key] !== undefined && prevResolved[key] === val;
    const isCustomised =
      Boolean(explicitlyCustomisedKeys?.has(key)) || !matchesPrevDefault;

    if (isCustomised) {
      (merged as Record<string, unknown>)[key] = val;
    }
  });

  return merged;
}
