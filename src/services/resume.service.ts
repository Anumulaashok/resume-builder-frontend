import {
  IResume as BaseResume,
  ISharing,
  IPrivacySettings,
  IResumeHistorySummaryItem,
  IResumeHistorySnapshot,
} from "../types/resume";
import axiosInstance from "../services/axios";
import { JobMatchResult } from "../types/jobMatch";
import {
  buildFallbackExportFilename,
  parseContentDispositionFilename,
} from "../utils/download";

export interface ExportedDocument {
  blob: Blob;
  filename: string;
}

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

export interface RestoreResumeVersionResult {
  resume: ResumeWithMeta;
  previousSnapshotIndex?: number;
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
          prompt,
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

  async getResumeHistory(resumeId: string): Promise<IResumeHistorySummaryItem[]> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: IResumeHistorySummaryItem[];
    }>(`/api/resumes/${resumeId}/history`);
    return response.data?.data || [];
  }

  async getResumeHistorySnapshot(
    resumeId: string,
    index: number
  ): Promise<IResumeHistorySnapshot> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: IResumeHistorySnapshot;
    }>(`/api/resumes/${resumeId}/history/${index}`);
    return response.data?.data;
  }

  async restoreResumeVersion(
    resumeId: string,
    index: number
  ): Promise<RestoreResumeVersionResult> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: ResumeWithMeta & { history?: unknown[] };
      previousSnapshotIndex?: number;
    }>(`/api/resumes/${resumeId}/history/${index}/restore`);

    const payload = response.data;
    const rawResume =
      payload && typeof payload === "object" && "data" in payload
        ? payload.data
        : (payload as ResumeWithMeta & { history?: unknown[] });
    const fallbackPrevIndex =
      Array.isArray(rawResume?.history) && rawResume.history.length > 0
        ? rawResume.history.length - 1
        : undefined;
    const previousSnapshotIndex =
      typeof payload?.previousSnapshotIndex === "number"
        ? payload.previousSnapshotIndex
        : fallbackPrevIndex;

    return {
      resume: unwrapResumeResponse(payload),
      previousSnapshotIndex,
    };
  }

  async exportResumeTxt(
    resumeId: string,
    fallbackTitle?: string
  ): Promise<ExportedDocument> {
    const response = await axiosInstance.get<Blob>(
      `/api/resumes/${resumeId}/export.txt`,
      {
        responseType: "blob",
      }
    );
    const fallback = buildFallbackExportFilename(fallbackTitle, "txt");
    const filename = parseContentDispositionFilename(
      response.headers?.["content-disposition"],
      fallback
    );
    const blob =
      response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: "text/plain;charset=utf-8" });
    return { blob, filename };
  }
}

export const resumeService = new ResumeService();
