export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  highlights?: string[];
  tags: string[];
  demoUrl?: string;
  githubUrl?: string;
  images: string[];
}

export interface PortfolioBasics {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

export interface PortfolioSkillItem {
  id: string;
  name: string;
  category?: string;
  level?: number;
}

export interface PortfolioExperienceItem {
  id: string;
  position: string;
  company: string;
  period?: string;
  description?: string;
}

export interface PortfolioSection {
  id: string;
  type: 'about' | 'projects' | 'skills' | 'experience' | 'contact' | 'custom';
  title: string;
  content: any[];
  enabled?: boolean;
  isCustom?: boolean;
}

export interface PortfolioThemeConfig {
  theme?: 'modern' | 'creative' | 'minimalist';
  primaryColor?: string;
  layout?: string;
}

export interface IPortfolio {
  _id?: string;
  id?: string;
  userId?: string;
  title: string;
  slug: string;
  isPublished: boolean;
  themeConfig?: PortfolioThemeConfig;
  basics: PortfolioBasics;
  sections: PortfolioSection[];
  sectionOrder: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const defaultPortfolio: IPortfolio = {
  title: 'My Web Portfolio',
  slug: 'my-portfolio',
  isPublished: false,
  themeConfig: {
    theme: 'modern',
    primaryColor: '#3B82F6',
    layout: 'standard'
  },
  basics: {
    name: 'Your Name',
    title: 'Software Developer & Creator',
    email: 'hello@example.com',
    phone: '',
    location: 'San Francisco, CA',
    bio: 'Passionate developer crafting modern, responsive, and intuitive web experiences.',
    avatarUrl: '',
    socialLinks: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      twitter: '',
      website: ''
    }
  },
  sections: [
    {
      id: 'about',
      type: 'about',
      title: 'About Me',
      content: [],
      enabled: true
    },
    {
      id: 'projects',
      type: 'projects',
      title: 'Featured Projects',
      content: [
        {
          id: 'proj-1',
          title: 'Resume & Portfolio Platform',
          description: 'A full-featured career platform with drag-and-drop workspace controls, live canvas inline editing, and media showcase galleries.',
          tags: ['React', 'TypeScript', 'Node.js', 'TailwindCSS'],
          demoUrl: 'https://example.com',
          githubUrl: 'https://github.com',
          images: []
        }
      ],
      enabled: true
    },
    {
      id: 'skills',
      type: 'skills',
      title: 'Skills & Tech Stack',
      content: [
        { id: 's1', name: 'React', category: 'Frontend', level: 90 },
        { id: 's2', name: 'TypeScript', category: 'Frontend', level: 85 },
        { id: 's3', name: 'Node.js', category: 'Backend', level: 85 },
        { id: 's4', name: 'TailwindCSS', category: 'Styling', level: 90 }
      ],
      enabled: true
    },
    {
      id: 'experience',
      type: 'experience',
      title: 'Experience',
      content: [
        {
          id: 'exp-1',
          position: 'Senior Frontend Developer',
          company: 'Tech Solutions Inc.',
          period: '2023 - Present',
          description: 'Led development of customer-facing web applications with focus on performance, responsiveness, and accessibility.'
        }
      ],
      enabled: true
    },
    {
      id: 'contact',
      type: 'contact',
      title: 'Get In Touch',
      content: [],
      enabled: true
    }
  ],
  sectionOrder: ['about', 'projects', 'skills', 'experience', 'contact']
};
