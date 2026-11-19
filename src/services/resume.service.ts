import { IResume as BaseResume, ISharing, IPrivacySettings } from "../types/resume";
import axiosInstance from "../services/axios";
import { JobMatchResult } from "../types/jobMatch";

export type Resume = BaseResume;

export interface ResumeWithMeta extends Resume {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIGenerateResponse {
  success: boolean;
  data: ResumeWithMeta;
}

// Removed mock sections and defaultLocation as they are no longer needed

class ResumeService {
  async generateFromPrompt(
    prompt: string,
    basics: { name: string; email: string }
  ): Promise<ResumeWithMeta> {
    const createResponse = await axiosInstance.post<{
      success: boolean;
      data: ResumeWithMeta;
    }>("/api/resumes", {
      title: "AI Draft",
      content: {
        basics: {
          name: basics.name,
          email: basics.email,
        },
        sections: [],
        sectionOrder: [],
      },
    });

    const createdResume =
      createResponse.data?.data ??
      (createResponse.data as unknown as Partial<ResumeWithMeta>);
    const newId = createdResume?._id || createdResume?.id;

    if (!newId) {
      throw new Error("Failed to create draft resume");
    }

    const response = await axiosInstance.post<AIGenerateResponse>(
      `/api/resumes/${newId}/generate`,
      {
        prompt,
      }
    );
    return response.data.data;
  }

  async createResume(resumeData: Partial<Resume>): Promise<ResumeWithMeta> {
    const response = await axiosInstance.post("/api/resumes", resumeData);
    return response.data;
  }

  async getResumes(): Promise<ResumeWithMeta[]> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: ResumeWithMeta[];
    }>("/api/resumes");

    // const response: any = {
    //   "success": true,
    //   "data": [
    //     {
    //       "content": {
    //         "basics": {
    //           "location": {
    //             "address": "",
    //             "city": "",
    //             "countryCode": "",
    //             "postalCode": ""
    //           },
    //           "name": "Anumula Ashok",
    //           "label": "Software engineer-1",
    //           "email": "ashoksmart850@gmail.com",
    //           "phone": "8179463267",
    //           "summary": ""
    //         },
    //         "sections": [],
    //         "sectionOrder": []
    //       },
    //       "_id": "6829d637b58e93c03f11f219",
    //       "title": "Anumula Ashok",
    //       "updatedAt": "2023-10-16T07:45:59.000Z",
    //     }
    //   ]
    // }
    return response?.data?.data || [];
  }

  async updateResume(
    id: string,
    resumeData: Partial<Resume>
  ): Promise<ResumeWithMeta> {
    const response = await axiosInstance.put(`/api/resumes/${id}`, resumeData);
    return response.data;
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
