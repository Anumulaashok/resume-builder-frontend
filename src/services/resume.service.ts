import { Resume as BaseResume } from "../types/resume";
import axiosInstance from "../services/axios";

export type Resume = BaseResume;

interface ResumeWithMeta extends Resume {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface AIGenerateResponse {
  success: boolean;
  resume: ResumeWithMeta;
}

// Removed mock sections and defaultLocation as they are no longer needed

class ResumeService {
  async generateFromPrompt(prompt: string): Promise<AIGenerateResponse> {
    return await axiosInstance.post("/api/resumes/generate", { prompt });
  }

  async createResume(resumeData: Partial<Resume>): Promise<ResumeWithMeta> {
    return await axiosInstance.post("/api/resumes", resumeData);
  }

async getResumes(): Promise<ResumeWithMeta[]> {
    const response = await axiosInstance.get<{ success: boolean; data: ResumeWithMeta[] }>("/api/resumes");
    return response.data.data;
}

  async updateResume(
    id: string,
    resumeData: Partial<Resume>
  ): Promise<ResumeWithMeta> {
    return await axiosInstance.put(`/api/resumes/${id}`, resumeData);
  }

  async deleteResume(id: string): Promise<void> {
    await axiosInstance.delete(`/api/resumes/${id}`);
  }
}

export const resumeService = new ResumeService();
