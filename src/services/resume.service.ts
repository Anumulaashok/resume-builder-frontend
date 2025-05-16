import { apiRequest } from './auth.service';

export interface Resume {
    id: string;
    title: string;
    content: any; // This will be the structured resume data
    userId: string;
    createdAt: string;
    updatedAt: string;
}

interface AIGenerateResponse {
    success: boolean;
    resume: Resume;
}

class ResumeService {
    private baseUrl: string = 'https://api.example.com'; // Replace with your actual API URL

    async generateFromPrompt(prompt: string): Promise<AIGenerateResponse> {
        try {
            console.log('AI Generate Resume Payload:', { prompt });
            
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // For development: return mock data
            return {
                success: true,
                resume: {
                    id: '1',
                    title: 'AI Generated Resume',
                    content: {
                        // Mock resume content structure
                        basics: {
                            name: 'John Doe',
                            label: 'Software Engineer',
                            email: 'john@example.com'
                        },
                        work: [],
                        education: [],
                        skills: []
                    },
                    userId: '1',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            };

            // Real API implementation:
            /*
            return await apiRequest(`${this.baseUrl}/resumes/generate`, {
                method: 'POST',
                body: JSON.stringify({ prompt })
            });
            */
        } catch (error) {
            console.error('Generate Resume Error:', error);
            throw error;
        }
    }

    async createResume(resumeData: Partial<Resume>): Promise<Resume> {
        try {
            console.log('Create Resume Payload:', resumeData);
            
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For development: return mock data
            return {
                id: Math.random().toString(36).substr(2, 9),
                title: resumeData.title || 'Untitled Resume',
                content: resumeData.content || {},
                userId: '1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Real API implementation:
            /*
            return await apiRequest(`${this.baseUrl}/resumes`, {
                method: 'POST',
                body: JSON.stringify(resumeData)
            });
            */
        } catch (error) {
            console.error('Create Resume Error:', error);
            throw error;
        }
    }

    async getResumes(): Promise<Resume[]> {
        try {
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For development: return mock data
            return [
                {
                    id: '1',
                    title: 'Software Engineer Resume',
                    content: {},
                    userId: '1',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];

            // Real API implementation:
            /*
            return await apiRequest(`${this.baseUrl}/resumes`, {
                method: 'GET'
            });
            */
        } catch (error) {
            console.error('Get Resumes Error:', error);
            throw error;
        }
    }

    async updateResume(id: string, resumeData: Partial<Resume>): Promise<Resume> {
        try {
            console.log('Update Resume Payload:', { id, ...resumeData });
            
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For development: return mock data
            return {
                id,
                title: resumeData.title || 'Updated Resume',
                content: resumeData.content || {},
                userId: '1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Real API implementation:
            /*
            return await apiRequest(`${this.baseUrl}/resumes/${id}`, {
                method: 'PUT',
                body: JSON.stringify(resumeData)
            });
            */
        } catch (error) {
            console.error('Update Resume Error:', error);
            throw error;
        }
    }

    async deleteResume(id: string): Promise<void> {
        try {
            console.log('Delete Resume:', id);
            
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Real API implementation:
            /*
            await apiRequest(`${this.baseUrl}/resumes/${id}`, {
                method: 'DELETE'
            });
            */
        } catch (error) {
            console.error('Delete Resume Error:', error);
            throw error;
        }
    }
}

export const resumeService = new ResumeService();
