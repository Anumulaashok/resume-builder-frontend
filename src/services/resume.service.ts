import axios from '../services/axios';
import { isAxiosError } from 'axios';
import { Resume as BaseResume } from '../types/resume';

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
        try {
            const { data } = await axios.post('/api/resumes/generate', { prompt });
            return data;
        } catch (error) {
            console.error('Generate Resume Error:', error);
            throw this.handleError(error);
        }
    }

    async createResume(resumeData: Partial<Resume>): Promise<ResumeWithMeta> {
        try {
            const { data } = await axios.post('/api/resumes', resumeData);
            return data;
        } catch (error) {
            console.error('Create Resume Error:', error);
            throw this.handleError(error);
        }
    }

    async getResumes(): Promise<ResumeWithMeta[]> {
        try {
            const { data } = await axios.get('/api/resumes');
            return data;
        } catch (error) {
            console.error('Get Resumes Error:', error);
            throw this.handleError(error);
        }
    }

    async updateResume(id: string, resumeData: Partial<Resume>): Promise<ResumeWithMeta> {
        try {
            const { data } = await axios.put(`/api/resumes/${id}`, resumeData);
            return data;
        } catch (error) {
            console.error('Update Resume Error:', error);
            throw this.handleError(error);
        }
    }

    async deleteResume(id: string): Promise<void> {
        try {
            await axios.delete(`/api/resumes/${id}`);
        } catch (error) {
            console.error('Delete Resume Error:', error);
            throw this.handleError(error);
        }
    }
    
    private handleError(error: unknown): Error {
        if (isAxiosError(error)) {
            return new Error(error.response?.data?.message || 'An error occurred');
        }
        return new Error('An unexpected error occurred');
    }
}

export const resumeService = new ResumeService();
