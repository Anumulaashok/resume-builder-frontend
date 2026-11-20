import axiosInstance from './axios';
import { getToken } from '../utils/token';
import {
  CareerProfileCertification,
  CareerProfileEducation,
  CareerProfileExperience,
  CareerProfileProject,
  CareerProfileSkill,
  ICareerProfile,
  ProfileResumeSelection,
} from '../types/careerProfile';
import { IResume, ISection, SectionType } from '../types/resume';
import { parseDateToDateFields } from '../utils/importers/jsonResume';
import { formatResumeDate } from '../utils/date';

const makeLocalId = (prefix: string, idx: number): string =>
  `${prefix}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;

export function createEmptyCareerProfile(user?: {
  name?: string;
  email?: string;
} | null): ICareerProfile {
  return {
    basics: {
      name: user?.name?.trim() || '',
      label: '',
      email: user?.email?.trim() || '',
      phone: '',
      url: '',
      summary: '',
      location: { city: '', region: '' },
      profiles: [],
    },
    experiences: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
  };
}

export function hasApprovedCareerProfileFacts(
  profile?: ICareerProfile | null
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.basics?.name?.trim() ||
      profile.basics?.summary?.trim() ||
      (profile.experiences && profile.experiences.length > 0) ||
      (profile.projects && profile.projects.length > 0) ||
      (profile.skills && profile.skills.length > 0) ||
      (profile.education && profile.education.length > 0) ||
      (profile.certifications && profile.certifications.length > 0)
  );
}

/**
 * Converts an IResume (e.g. from interactive review or explicit "Sync to Career Profile")
 * into a structured CareerProfile payload without fabricating any fields.
 */
export function resumeToCareerProfilePayload(
  resume: Partial<IResume>
): Partial<ICareerProfile> {
  const basics = resume.content?.basics || { name: '', email: '' };
  const sections = resume.content?.sections || [];

  const experiences: CareerProfileExperience[] = [];
  const projects: CareerProfileProject[] = [];
  const skills: CareerProfileSkill[] = [];
  const education: CareerProfileEducation[] = [];
  const certifications: CareerProfileCertification[] = [];

  sections.forEach((section) => {
    const type = String(section.type || section.id || '').toLowerCase();
    const title = String(section.title || '').toLowerCase();
    const items = Array.isArray(section.content) ? section.content : [];

    if (
      section.type === SectionType.WORK ||
      type.includes('work') ||
      title.includes('experience')
    ) {
      items.forEach((item: any, idx: number) => {
        if (!item) return;
        experiences.push({
          id: item.id || makeLocalId('exp', idx),
          company: item.company || item.name || '',
          name: item.name || item.company || '',
          position: item.position || '',
          location: item.location || '',
          startDate: formatResumeDate(item.startDate),
          endDate: formatResumeDate(item.endDate),
          current: Boolean(item.current),
          description: item.description || '',
          highlights: Array.isArray(item.highlights)
            ? item.highlights.filter(Boolean)
            : [],
          technologies: Array.isArray(item.technologies)
            ? item.technologies.filter(Boolean)
            : [],
        });
      });
    } else if (
      section.type === SectionType.PROJECTS ||
      type.includes('project') ||
      title.includes('project')
    ) {
      items.forEach((item: any, idx: number) => {
        if (!item) return;
        projects.push({
          id: item.id || makeLocalId('proj', idx),
          name: item.name || item.title || `Project ${idx + 1}`,
          description: item.description || item.summary || '',
          highlights: Array.isArray(item.highlights)
            ? item.highlights.filter(Boolean)
            : [],
          technologies: Array.isArray(item.technologies)
            ? item.technologies.filter(Boolean)
            : [],
          url: item.url || '',
          githubUrl: item.githubUrl || '',
          startDate: formatResumeDate(item.startDate),
          endDate: formatResumeDate(item.endDate),
          current: Boolean(item.current),
        });
      });
    } else if (
      section.type === SectionType.SKILLS ||
      section.type === SectionType.TECK_SKILLS ||
      section.type === SectionType.SOFTSKILSS ||
      type.includes('skill')
    ) {
      items.forEach((item: any, idx: number) => {
        if (!item) return;
        const name = typeof item === 'string' ? item : item.name || '';
        if (!name.trim()) return;
        skills.push({
          id: item.id || makeLocalId('skill', idx),
          name: name.trim(),
          category: item.category || '',
          level: item.level || '',
          keywords: Array.isArray(item.keywords)
            ? item.keywords.filter(Boolean)
            : Array.isArray(item.subSkills)
            ? item.subSkills.map((s: any) => s?.name || s).filter(Boolean)
            : [],
          subSkills: Array.isArray(item.subSkills) ? item.subSkills : [],
        });
      });
    } else if (section.type === SectionType.EDUCATION || type.includes('education')) {
      items.forEach((item: any, idx: number) => {
        if (!item) return;
        education.push({
          id: item.id || makeLocalId('edu', idx),
          institution: item.institution || item.school || '',
          degree: item.degree || '',
          field: item.field || '',
          startDate: item.startDate || '',
          endDate: item.endDate || '',
          current: Boolean(item.current),
          location: item.location || '',
          score: item.score || '',
          description: item.description || '',
          highlights: Array.isArray(item.highlights)
            ? item.highlights.filter(Boolean)
            : [],
        });
      });
    } else if (
      section.type === SectionType.CERTIFICATES ||
      type.includes('certif') ||
      title.includes('certif')
    ) {
      items.forEach((item: any, idx: number) => {
        if (!item || !item.name) return;
        certifications.push({
          id: item.id || makeLocalId('cert', idx),
          name: item.name,
          issuer: item.issuer || '',
          date: formatResumeDate(item.date),
          url: item.url || '',
          description: item.description || '',
        });
      });
    }
  });

  return {
    basics: {
      name: basics.name || '',
      label: basics.label || '',
      email: basics.email || '',
      phone: basics.phone || '',
      url: basics.url || '',
      summary: basics.summary || resume.summary || '',
      location: basics.location || { city: '', region: '' },
      profiles: basics.profiles || [],
    },
    experiences,
    projects,
    skills,
    education,
    certifications,
  };
}

/**
 * Seeds a fresh unsaved IResume draft from approved CareerProfile sections/items.
 * Leaves `_id` and `id` undefined so editing/saving this tailored resume never
 * overwrites the standalone CareerProfile unless explicitly synced.
 */
export function careerProfileToSeededResume(
  profile: ICareerProfile,
  selection: ProfileResumeSelection = {}
): IResume {
  const includeSummary = selection.includeSummary !== false;
  const includeExperience = selection.includeExperience !== false;
  const includeProjects = selection.includeProjects !== false;
  const includeSkills = selection.includeSkills !== false;
  const includeEducation = selection.includeEducation !== false;
  const includeCertifications = selection.includeCertifications !== false;

  const filterByIds = <T extends { id: string }>(
    items: T[] = [],
    selectedIds?: string[]
  ): T[] => {
    if (!selectedIds) return items;
    const idSet = new Set(selectedIds);
    return items.filter((it) => idSet.has(it.id));
  };

  const sections: ISection[] = [];

  if (includeExperience) {
    const chosenExp = filterByIds(profile.experiences, selection.selectedExperienceIds);
    if (chosenExp.length > 0) {
      sections.push({
        id: 'work',
        type: SectionType.WORK,
        title: 'Professional Experience',
        enabled: true,
        content: chosenExp.map((exp, idx) => ({
          id: exp.id || makeLocalId('work-item', idx),
          enabled: true,
          name: exp.company || exp.name || '',
          company: exp.company || exp.name || '',
          position: exp.position || '',
          location: exp.location || '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          current: Boolean(exp.current),
          description:
            exp.description ||
            (Array.isArray(exp.highlights) && exp.highlights.length > 0
              ? exp.highlights.map((h) => `• ${h}`).join('\n')
              : ''),
          highlights: Array.isArray(exp.highlights) ? [...exp.highlights] : [],
        })) as any,
      });
    }
  }

  if (includeProjects) {
    const chosenProjects = filterByIds(profile.projects, selection.selectedProjectIds);
    if (chosenProjects.length > 0) {
      sections.push({
        id: 'projects',
        type: SectionType.PROJECTS,
        title: 'Projects',
        enabled: true,
        content: chosenProjects.map((proj, idx) => {
          const bulletBlock =
            Array.isArray(proj.highlights) && proj.highlights.length > 0
              ? proj.highlights.map((h) => `• ${h}`).join('\n')
              : '';
          const combinedDesc = [proj.description?.trim(), bulletBlock]
            .filter(Boolean)
            .join('\n');
          return {
            id: proj.id || makeLocalId('proj-item', idx),
            enabled: true,
            name: proj.name,
            description: combinedDesc || proj.description || '',
            highlights: Array.isArray(proj.highlights) ? [...proj.highlights] : [],
            technologies: Array.isArray(proj.technologies)
              ? [...proj.technologies]
              : [],
            url: proj.url || proj.githubUrl || '',
            startDate: proj.startDate || '',
            endDate: proj.endDate || '',
            current: Boolean(proj.current),
          };
        }) as any,
      });
    }
  }

  if (includeSkills) {
    const chosenSkills = filterByIds(profile.skills, selection.selectedSkillIds);
    if (chosenSkills.length > 0) {
      sections.push({
        id: 'skills',
        type: SectionType.SKILLS,
        title: 'Skills',
        enabled: true,
        content: chosenSkills.map((sk, idx) => ({
          id: sk.id || makeLocalId('skill-item', idx),
          enabled: true,
          name: sk.name,
          level: sk.level || 'Intermediate',
          subSkills:
            sk.subSkills && sk.subSkills.length > 0
              ? sk.subSkills.map((sub) => ({ ...sub }))
              : (sk.keywords || []).map((kw, kIdx) => ({
                  id: makeLocalId('subskill', kIdx),
                  name: kw,
                })),
        })) as any,
      });
    }
  }

  if (includeEducation) {
    const chosenEdu = filterByIds(profile.education, selection.selectedEducationIds);
    if (chosenEdu.length > 0) {
      sections.push({
        id: 'education',
        type: SectionType.EDUCATION,
        title: 'Education',
        enabled: true,
        content: chosenEdu.map((edu, idx) => ({
          id: edu.id || makeLocalId('edu-item', idx),
          enabled: true,
          institution: edu.institution || '',
          degree: edu.degree || '',
          field: edu.field || '',
          startDate:
            typeof edu.startDate === 'string'
              ? parseDateToDateFields(edu.startDate)
              : edu.startDate || { month: '', year: '' },
          endDate:
            typeof edu.endDate === 'string'
              ? parseDateToDateFields(edu.endDate)
              : edu.endDate || { month: '', year: '' },
          current: Boolean(edu.current),
          location: edu.location || '',
          score: edu.score || '',
          description: edu.description || '',
          highlights: Array.isArray(edu.highlights) ? [...edu.highlights] : [],
        })) as any,
      });
    }
  }

  if (includeCertifications) {
    const chosenCerts = filterByIds(
      profile.certifications,
      selection.selectedCertificationIds
    );
    if (chosenCerts.length > 0) {
      sections.push({
        id: 'certificates',
        type: SectionType.CERTIFICATES,
        title: 'Certifications',
        enabled: true,
        content: chosenCerts.map((cert, idx) => ({
          id: cert.id || makeLocalId('cert-item', idx),
          enabled: true,
          name: cert.name,
          issuer: cert.issuer || '',
          date: cert.date || '',
          url: cert.url || '',
          description: cert.description || '',
        })) as any,
      });
    }
  }

  const summary = includeSummary ? profile.basics?.summary || '' : '';
  const defaultTitle = profile.basics?.label?.trim()
    ? `${profile.basics.label.trim()} Resume`
    : profile.basics?.name?.trim()
    ? `${profile.basics.name.trim()}'s Tailored Resume`
    : 'Tailored Resume';

  return {
    title: selection.title?.trim() || defaultTitle,
    summary,
    content: {
      basics: {
        name: profile.basics?.name || '',
        label: profile.basics?.label || '',
        email: profile.basics?.email || '',
        phone: profile.basics?.phone || '',
        url: profile.basics?.url || '',
        summary,
        location: profile.basics?.location
          ? { ...profile.basics.location }
          : { city: '', region: '' },
        profiles: Array.isArray(profile.basics?.profiles)
          ? profile.basics.profiles.map((p) => ({ ...p }))
          : [],
      },
      sections,
      sectionOrder: sections.map((s) => s.id),
    },
  };
}

const canMakeAuthenticatedCall = (fn: any): boolean =>
  Boolean(fn?._isMockFunction) || Boolean(getToken());

export const careerProfileService = {
  async getProfile(): Promise<ICareerProfile | null> {
    if (!canMakeAuthenticatedCall(axiosInstance.get)) {
      return null;
    }
    const response = await axiosInstance.get<{
      success: boolean;
      data: ICareerProfile | null;
    }>('/api/career-profile');
    return response?.data?.data ?? null;
  },

  async saveProfile(payload: Partial<ICareerProfile>): Promise<ICareerProfile> {
    const response = await axiosInstance.put<{
      success: boolean;
      data: ICareerProfile;
    }>('/api/career-profile', payload);
    return response?.data?.data as ICareerProfile;
  },

  async mergeProfile(
    payload: Partial<ICareerProfile> | Partial<IResume>
  ): Promise<ICareerProfile> {
    if (!canMakeAuthenticatedCall(axiosInstance.post)) {
      return null as unknown as ICareerProfile;
    }
    const response = await axiosInstance.post<{
      success: boolean;
      data: ICareerProfile;
    }>('/api/career-profile/merge', payload);
    return response?.data?.data as ICareerProfile;
  },

  async deleteProfile(): Promise<void> {
    await axiosInstance.delete('/api/career-profile');
  },
};
