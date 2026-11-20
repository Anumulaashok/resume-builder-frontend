import { IResume, SectionType } from '../../types/resume';

export const sampleResume: IResume = {
  _id: 'sample-resume-preview',
  title: 'Maya Lin — Staff Software Architect',
  templateId: 'modern',
  content: {
    basics: {
      name: 'Maya Lin',
      label: 'Staff Frontend & Platform Architect',
      email: 'maya.lin@example.dev',
      phone: '+1 (415) 555-0184',
      summary:
        'Staff engineer with 9+ years of experience designing resilient web platforms, accessible component libraries, and developer tooling used by 4M+ monthly active users.',
      location: {
        address: '742 Market Street',
        city: 'San Francisco',
        countryCode: 'US',
        postalCode: '94103',
      },
      website: 'https://mayalin.dev',
      github: 'https://github.com/mayalin',
      linkedin: 'https://linkedin.com/in/mayalin',
    },
    sections: [
      {
        id: 'sample-work',
        type: SectionType.WORK,
        title: 'Work Experience',
        enabled: true,
        content: [
          {
            id: 'work-1',
            name: 'Veridian Cloud',
            position: 'Staff Frontend Architect',
            startDate: 'Mar 2022',
            current: true,
            location: 'San Francisco, CA',
            description:
              'Spearheaded the unified multi-product design system and micro-frontend runtime across 14 engineering squads.',
            ...({
              highlights: [
                'Cut P95 bundle load time by 41% via route-level code splitting and streaming SSR.',
                'Mentored 8 senior engineers and authored accessibility gates achieving WCAG 2.1 AA compliance.',
              ],
            } as Record<string, unknown>),
          },
          {
            id: 'work-2',
            name: 'PulseMetrics',
            position: 'Senior Product Engineer',
            startDate: 'Jun 2018',
            endDate: 'Feb 2022',
            current: false,
            location: 'Seattle, WA',
            description:
              'Built real-time observability dashboards rendering 100k+ time-series data points at 60fps.',
          },
        ],
      },
      {
        id: 'sample-projects',
        type: SectionType.PROJECTS,
        title: 'Featured Projects',
        enabled: true,
        content: [
          {
            id: 'proj-1',
            name: 'Lattice UI Primitives',
            startDate: '2023',
            endDate: '2025',
            url: 'https://github.com/mayalin/lattice-ui',
            technologies: ['TypeScript', 'React', 'ARIA', 'Tailwind CSS'],
            description:
              'Zero-dependency accessible dialog, combobox, and grid primitives with 6.5k GitHub stars.',
          },
        ],
      },
      {
        id: 'sample-education',
        type: SectionType.EDUCATION,
        title: 'Education',
        enabled: true,
        content: [
          {
            id: 'edu-1',
            degree: 'M.S. in Computer Science',
            field: 'Human-Computer Interaction',
            startDate: { month: 'Sep', year: '2016' },
            endDate: { month: 'May', year: '2018' },
            location: 'Berkeley, CA',
            description: 'University of California, Berkeley · Research Fellow in Interactive Systems.',
          },
        ],
      },
      {
        id: 'sample-skills',
        type: SectionType.SKILLS,
        title: 'Core Skills',
        enabled: true,
        content: [
          {
            id: 'skill-1',
            name: 'Frontend Architecture',
            level: 5,
            subSkills: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'GraphQL'],
          },
          {
            id: 'skill-2',
            name: 'Platform & Quality',
            level: 4,
            subSkills: ['Node.js', 'Playwright', 'Jest', 'CI/CD', 'Web Performance'],
          },
        ],
      },
      {
        id: 'sample-languages',
        type: SectionType.LANGUAGES,
        title: 'Languages',
        enabled: true,
        content: [
          { id: 'lang-1', name: 'English', level: 'Native', proficiency: 100 },
          { id: 'lang-2', name: 'Mandarin', level: 'Fluent', proficiency: 90 },
        ],
      },
      {
        id: 'sample-certificates',
        type: SectionType.CERTIFICATES,
        title: 'Certifications',
        enabled: true,
        content: [
          {
            id: 'cert-1',
            name: 'W3C Web Accessibility Specialist',
            issuer: 'IAAP',
            date: 'Oct 2023',
            url: 'https://accessibilityassociation.org',
          },
        ],
      },
      {
        id: 'sample-awards',
        type: SectionType.AWARDS,
        title: 'Honors & Awards',
        enabled: true,
        content: [
          {
            id: 'award-1',
            name: 'Distinguished Engineering Impact Award',
            issuer: 'Veridian Cloud',
            date: 'Nov 2024',
            description: 'Recognized for cross-org design token architecture.',
          },
        ],
      },
      {
        id: 'sample-achievements',
        type: SectionType.ACHIVEMENTS,
        title: 'Key Achievements',
        enabled: true,
        content: [
          {
            id: 'ach-1',
            name: 'Keynote Speaker at JSConf West',
            date: 'May 2024',
            description: 'Presented resilient state synchronization patterns to 1,200 attendees.',
          },
        ],
      },
      {
        id: 'sample-publications',
        type: SectionType.PUBLICATIONS,
        title: 'Publications',
        enabled: true,
        content: [
          {
            id: 'pub-1',
            title: 'Composable Accessibility Trees for Rich Canvas Editors',
            publisher: 'ACM UIST Proceedings',
            date: 'Sep 2023',
            url: 'https://dl.acm.org',
            description: 'Co-authored paper on hybrid DOM-canvas screen-reader navigation.',
          },
        ],
      },
      {
        id: 'sample-courses',
        type: SectionType.COURSES,
        title: 'Selected Courses',
        enabled: true,
        content: [
          {
            id: 'course-1',
            name: 'Distributed Systems Engineering',
            institution: 'MIT OpenCourseWare',
            date: '2021',
            description: 'Consensus protocols, fault tolerance, and replicated state machines.',
          },
        ],
      },
      {
        id: 'sample-organizations',
        type: SectionType.ORGANIZATIONS,
        title: 'Organizations',
        enabled: true,
        content: [
          {
            id: 'org-1',
            name: 'OpenJS Accessibility Working Group',
            position: 'Core Maintainer',
            startDate: 'Jan 2021',
            current: true,
            description: 'Reviewing ARIA patterns and automated auditing benchmarks.',
          },
        ],
      },
      {
        id: 'sample-interests',
        type: SectionType.INTERESTS,
        title: 'Interests',
        enabled: true,
        content: [
          { id: 'int-1', name: 'Typography & Editorial Design' },
          { id: 'int-2', name: 'Trail Running' },
          { id: 'int-3', name: 'Analog Photography' },
        ],
      },
      {
        id: 'sample-references',
        type: SectionType.REFERENCES,
        title: 'References',
        enabled: true,
        content: [
          {
            id: 'ref-1',
            name: 'Devon Brooks',
            position: 'VP of Engineering',
            company: 'Veridian Cloud',
            contact: 'devon.brooks@example.dev',
            description: 'Available upon request.',
          },
        ],
      },
      {
        id: 'sample-custom',
        type: SectionType.CUSTOM,
        title: 'Community Mentorship',
        enabled: true,
        isCustom: true,
        content: [
          {
            id: 'cust-1',
            title: 'CodePath Career Fellow Mentor',
            subtitle: 'Volunteer Advisor',
            startDate: '2022',
            endDate: '2025',
            location: 'Remote',
            description: 'Coached 25+ early-career engineers on system design and frontend architecture.',
          },
        ],
      },
    ],
    sectionOrder: [
      'sample-work',
      'sample-projects',
      'sample-education',
      'sample-skills',
      'sample-achievements',
      'sample-publications',
      'sample-certificates',
      'sample-awards',
      'sample-organizations',
      'sample-courses',
      'sample-languages',
      'sample-interests',
      'sample-references',
      'sample-custom',
    ],
  },
};
