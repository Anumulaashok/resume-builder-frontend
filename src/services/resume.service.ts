import { IResume as BaseResume } from "../types/resume";
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
    const response = await axiosInstance.post("/api/resumes/generate", {
      prompt,
    });
    return response.data;
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

  async deleteResume(id: string): Promise<void> {
    await axiosInstance.delete(`/api/resumes/${id}`);
  }
}

export const resumeService = new ResumeService();
