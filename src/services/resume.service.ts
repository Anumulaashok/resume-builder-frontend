import { Resume as BaseResume, ResumeSection } from '../types/resume';

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

// Mock sections for development
const mockSections: ResumeSection[] = [
    {
        id: 'work-1',
        type: 'work',
        title: 'Work Experience',
        content: [],
        isCustom: false
    },
    {
        id: 'education-1',
        type: 'education',
        title: 'Education',
        content: [],
        isCustom: false
    },
    {
        id: 'skills-1',
        type: 'skills',
        title: 'Skills',
        content: [],
        isCustom: false
    }
];

const defaultLocation = {
    address: '',
    city: '',
    countryCode: '',
    postalCode: ''
};

class ResumeService {
    private baseUrl: string = process.env.REACT_APP_API_URL || 'https://api.example.com';

    async generateFromPrompt(prompt: string): Promise<AIGenerateResponse> {
        try {
            console.log('AI Generate Resume Payload:', { prompt });
            
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // For development: return mock data with proper structure
            return {
                success: true,
                resume: {
                    id: '1',
                    title: 'AI Generated Resume',
                    content: {
                        basics: {
                            name: 'John Doe',
                            label: 'Software Engineer',
                            email: 'john@example.com',
                            phone: '+1 (555) 123-4567',
                            summary: 'Experienced software engineer with a focus on frontend development.',
                            location: defaultLocation
                        },
                        sections: mockSections,
                        sectionOrder: mockSections.map(s => s.id)
                    },
                    userId: '1',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Generate Resume Error:', error);
            throw this.handleError(error);
        }
    }

    async createResume(resumeData: Partial<Resume>): Promise<ResumeWithMeta> {
        try {
            console.log('Create Resume Payload:', resumeData);
            
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For development: return mock data with proper structure
            const newResume: ResumeWithMeta = {
                id: Math.random().toString(36).substr(2, 9),
                title: resumeData.title || 'Untitled Resume',
                content: {
                    basics: resumeData.content?.basics || {
                        name: '',
                        label: '',
                        email: '',
                        phone: '',
                        summary: '',
                        location: defaultLocation
                    },
                    sections: resumeData.content?.sections || [],
                    sectionOrder: resumeData.content?.sectionOrder || []
                },
                userId: '1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            return newResume;
        } catch (error) {
            console.error('Create Resume Error:', error);
            throw this.handleError(error);
        }
    }

    async getResumes(): Promise<ResumeWithMeta[]> {
        try {
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For development: return mock data with proper structure
            return [
                {
                    id: '1',
                    title: 'Software Engineer Resume',
                    content: {
                        basics: {
                            name: 'John Doe',
                            label: 'Senior Software Engineer',
                            email: 'john@example.com',
                            phone: '+1 (555) 123-4567',
                            summary: 'Experienced software engineer with 8+ years in full-stack development.',
                            location: defaultLocation
                        },
                        sections: mockSections,
                        sectionOrder: mockSections.map(s => s.id)
                    },
                    userId: '1',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
        } catch (error) {
            console.error('Get Resumes Error:', error);
            throw this.handleError(error);
        }
    }

    async updateResume(id: string, resumeData: Partial<Resume>): Promise<ResumeWithMeta> {
        try {
            console.log('Update Resume Payload:', { id, ...resumeData });
            
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For development: return mock data with proper structure
            return {
                id,
                title: resumeData.title || 'Updated Resume',
                content: {
                    basics: resumeData.content?.basics || {
                        name: '',
                        label: '',
                        email: '',
                        phone: '',
                        summary: '',
                        location: defaultLocation
                    },
                    sections: resumeData.content?.sections || [],
                    sectionOrder: resumeData.content?.sectionOrder || []
                },
                userId: '1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Update Resume Error:', error);
            throw this.handleError(error);
        }
    }

    async deleteResume(id: string): Promise<void> {
        try {
            console.log('Delete Resume:', id);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Delete Resume Error:', error);
            throw this.handleError(error);
        }
    }

    private handleError(error: unknown): Error {
        if (error instanceof Error) {
            return error;
        }
        return new Error('An unexpected error occurred');
    }
}

export const resumeService = new ResumeService();
