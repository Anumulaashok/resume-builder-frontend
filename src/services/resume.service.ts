import { IResume as BaseResume, ISharing, IPrivacySettings } from "../types/resume";
import axiosInstance from "../services/axios";
import { JobMatchResult } from "../types/jobMatch";
import {
  maskPII,
  PersonalIdentifiers,
  validatePromptLength,
} from "../utils/piiMasker";

export type Resume = BaseResume;

export interface ResumeWithMeta extends Resume {
  id: string;
  _id?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIGenerateResponse {
  success: boolean;
  data: ResumeWithMeta;
}

export interface AISummaryResponse {
  success: boolean;
  data: {
    summary: string;
    suggestions: string[];
  };
}

export interface AIBulletOptimizeResponse {
  success: boolean;
  data: {
    suggestions: string[];
  };
}

export function normalizeResumeIdentifiers<T extends Partial<Resume>>(
  resume: T
): T {
  if (!resume || typeof resume !== "object") {
    return resume;
  }
  const resolvedId = resume._id || resume.id;
  if (!resolvedId) {
    return resume;
  }
  return {
    ...resume,
    _id: resume._id || resolvedId,
    id: resume.id || resolvedId,
  };
}

function unwrapResumeResponse(
  payload: { success?: boolean; data?: ResumeWithMeta } | ResumeWithMeta
): ResumeWithMeta {
  const record =
    payload && typeof payload === "object" && "data" in payload
      ? (payload.data as ResumeWithMeta)
      : (payload as ResumeWithMeta);
  return normalizeResumeIdentifiers(record);
}

// Removed mock sections and defaultLocation as they are no longer needed

class ResumeService {
  async generateFromPrompt(
    prompt: string,
    basics: { name: string; email: string }
  ): Promise<ResumeWithMeta> {
    validatePromptLength(prompt, "Prompt");
    const maskedPrompt = maskPII(prompt, basics);

    const createResponse = await axiosInstance.post<AIGenerateResponse>(
      "/api/resumes",
      {
        title: "AI Draft",
        content: {
          basics: {
            name: basics.name,
            email: basics.email,
          },
          sections: [],
          sectionOrder: [],
        },
      }
    );

    const createdResume = createResponse.data?.data;
    const resumeId = createdResume?._id || createdResume?.id;
    if (!resumeId) {
      throw new Error("Failed to retrieve ID for AI draft resume");
    }

    try {
      const response = await axiosInstance.post<AIGenerateResponse>(
        `/api/resumes/${resumeId}/generate`,
        {
          prompt: maskedPrompt,
        }
      );
      const generatedResume = response.data?.data;
      if (!generatedResume) {
        throw new Error("Failed to generate resume content");
      }
      return normalizeResumeIdentifiers(generatedResume);
    } catch (generateError) {
      try {
        await this.deleteResume(resumeId);
      } catch {
        // Ignore cleanup failure so the original generation error is preserved
      }
      throw generateError;
    }
  }

  async generateResume(
    prompt: string,
    basics?: { name?: string; email?: string }
  ): Promise<ResumeWithMeta> {
    validatePromptLength(prompt, "Prompt");
    const maskedPrompt = maskPII(prompt, basics);

    const response = await axiosInstance.post<AIGenerateResponse>(
      "/api/resumes/generate",
      {
        prompt: maskedPrompt,
        ...(basics ? { basics } : {}),
      }
    );

    const generatedResume = response.data?.data;
    if (!generatedResume) {
      throw new Error("Failed to generate resume content");
    }
    return normalizeResumeIdentifiers(generatedResume);
  }

  async generateSummary(
    params: {
      prompt?: string;
      targetRole?: string;
      experienceContext?: string;
      currentSummary?: string;
    },
    identifiers?: PersonalIdentifiers
  ): Promise<{ summary: string; suggestions: string[] }> {
    const maskedPrompt = params.prompt
      ? maskPII(params.prompt, identifiers)
      : undefined;
    const maskedRole = params.targetRole
      ? maskPII(params.targetRole, identifiers)
      : undefined;
    const maskedContext = params.experienceContext
      ? maskPII(params.experienceContext, identifiers)
      : undefined;
    const maskedCurrent = params.currentSummary
      ? maskPII(params.currentSummary, identifiers)
      : undefined;

    const combined = [maskedRole, maskedPrompt, maskedContext, maskedCurrent]
      .filter(Boolean)
      .join("\n");
    validatePromptLength(combined, "Prompt");

    const response = await axiosInstance.post<AISummaryResponse>(
      "/api/resumes/generate-summary",
      {
        prompt: maskedPrompt,
        targetRole: maskedRole,
        experienceContext: maskedContext,
        currentSummary: maskedCurrent,
      }
    );

    return (
      response.data?.data || {
        summary: "",
        suggestions: [],
      }
    );
  }

  async optimizeBullet(
    params: {
      bullet: string;
      role?: string;
      company?: string;
      targetRole?: string;
      context?: string;
    },
    identifiers?: PersonalIdentifiers
  ): Promise<{ suggestions: string[] }> {
    validatePromptLength(params.bullet, "Bullet point");
    const maskedBullet = maskPII(params.bullet, identifiers);
    const maskedRole = params.role ? maskPII(params.role, identifiers) : undefined;
    const maskedCompany = params.company
      ? maskPII(params.company, identifiers)
      : undefined;
    const maskedTargetRole = params.targetRole
      ? maskPII(params.targetRole, identifiers)
      : undefined;
    const maskedContext = params.context
      ? maskPII(params.context, identifiers)
      : undefined;

    const combined = [
      maskedBullet,
      maskedRole,
      maskedCompany,
      maskedTargetRole,
      maskedContext,
    ]
      .filter(Boolean)
      .join("\n");
    validatePromptLength(combined, "Prompt");

    const response = await axiosInstance.post<AIBulletOptimizeResponse>(
      "/api/resumes/optimize-bullet",
      {
        bullet: maskedBullet,
        role: maskedRole,
        company: maskedCompany,
        targetRole: maskedTargetRole,
        context: maskedContext,
      }
    );

    return response.data?.data || { suggestions: [] };
  }

  async createResume(resumeData: Partial<Resume>): Promise<ResumeWithMeta> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: ResumeWithMeta;
    }>("/api/resumes", resumeData);
    return unwrapResumeResponse(response.data);
  }

  async getResumes(): Promise<ResumeWithMeta[]> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: ResumeWithMeta[];
    }>("/api/resumes");

    const resumes = response?.data?.data || [];
    return resumes.map((resume) => normalizeResumeIdentifiers(resume));
  }

  async updateResume(
    id: string,
    resumeData: Partial<Resume>
  ): Promise<ResumeWithMeta> {
    const response = await axiosInstance.put<{
      success: boolean;
      data: ResumeWithMeta;
    }>(`/api/resumes/${id}`, resumeData);
    return unwrapResumeResponse(response.data);
  }

  async analyzeJobMatch(id: string, jobDescription: string, jobTitle?: string): Promise<JobMatchResult> {
    const response = await axiosInstance.post<{ success: boolean; data: JobMatchResult }>(
      `/api/resumes/${id}/job-match`,
      { jobDescription, jobTitle: jobTitle || undefined }
    );
    return response.data.data;
  }

  async deleteResume(id: string): Promise<void> {
    await axiosInstance.delete(`/api/resumes/${id}`);
  }

  async getPublicResume(shareToken: string): Promise<Resume> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: Resume;
    }>(`/api/resumes/share/${shareToken}`);
    return response.data?.data;
  }

  async getShareSettings(resumeId: string): Promise<ISharing> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: ISharing;
    }>(`/api/resumes/${resumeId}/share`);
    return response.data?.data;
  }

  async updateShareSettings(
    resumeId: string,
    settings: {
      isPublic?: boolean;
      privacy?: Partial<IPrivacySettings>;
      privacySettings?: Partial<IPrivacySettings>;
      regenerateToken?: boolean;
    }
  ): Promise<ISharing> {
    const response = await axiosInstance.patch<{
      success: boolean;
      data: ISharing;
    }>(`/api/resumes/${resumeId}/share`, settings);
    return response.data?.data;
  }
}

export const resumeService = new ResumeService();
