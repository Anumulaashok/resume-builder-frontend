import axiosInstance from './axios';
import {
  ExtractedResumeStagingResponse,
  ICareerProfile,
} from '../types/careerProfile';
import { IPortfolio } from '../types/portfolio';
import { normalizeResumeIdentifiers, ResumeWithMeta } from './resume.service';

export interface SeedResumeOptions {
  title?: string;
  targetRole?: string;
  jobDescription?: string;
  prompt?: string;
  templateId?: string;
}

export interface SeedPortfolioOptions {
  title?: string;
  slug?: string;
}

class CareerProfileService {
  async getProfile(): Promise<ICareerProfile> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: ICareerProfile;
    }>('/api/career-profile');
    return response.data.data;
  }

  async saveProfile(profile: Partial<ICareerProfile>): Promise<ICareerProfile> {
    const response = await axiosInstance.put<{
      success: boolean;
      data: ICareerProfile;
    }>('/api/career-profile', profile);
    return response.data.data;
  }

  async extractImportFile(file: File): Promise<ExtractedResumeStagingResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post<{
      success: boolean;
      data: ExtractedResumeStagingResponse;
    }>('/api/career-profile/import/extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  async approveImport(
    stagedProfile: Partial<ICareerProfile>,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<ICareerProfile> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: ICareerProfile;
    }>('/api/career-profile/import/approve', {
      stagedProfile,
      mode,
    });
    return response.data.data;
  }

  async seedResume(options?: SeedResumeOptions): Promise<ResumeWithMeta> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: ResumeWithMeta;
    }>('/api/career-profile/seed-resume', options || {});
    return normalizeResumeIdentifiers(response.data.data);
  }

  async seedPortfolio(options?: SeedPortfolioOptions): Promise<IPortfolio> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: IPortfolio;
    }>('/api/career-profile/seed-portfolio', options || {});
    return response.data.data;
  }

  async confirmSkill(skill: string): Promise<ICareerProfile> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: ICareerProfile;
    }>('/api/career-profile/skills/confirm', { skill });
    return response.data.data;
  }
}

export const careerProfileService = new CareerProfileService();
