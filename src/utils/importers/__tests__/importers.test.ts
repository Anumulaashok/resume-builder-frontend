import { IResume, SectionType } from '../../../types/resume';
import {
  JSON_RESUME_SCHEMA_V1,
  JsonResumeSchema,
  buildJsonResumeFilename,
  downloadResumeAsJson,
  exportJsonResume,
  extractDateRangeFromLine,
  formatDateFromJson,
  formatToJsonResumeDate,
  hasRecognizedJsonResumeFields,
  importJsonResume,
  parseDateToDateFields,
  parseJsonResumeString,
  parseResumeText,
} from '../index';

const buildFullJsonResumeFixture = (): JsonResumeSchema => ({
  $schema: JSON_RESUME_SCHEMA_V1,
  basics: {
    name: 'Elena Rostova',
    label: 'Principal Distributed Systems Engineer',
    image: 'https://cdn.example.com/elena.jpg',
    email: 'elena.rostova@example.com',
    phone: '+1 (415) 555-0184',
    url: 'https://elenarostova.dev',
    summary:
      'Distributed systems architect with 10+ years building low-latency storage and developer infrastructure.',
    location: {
      address: '742 Evergreen Terrace',
      postalCode: '94107',
      city: 'San Francisco',
      countryCode: 'US',
      region: 'CA',
    },
    profiles: [
      {
        network: 'GitHub',
        username: 'erostova',
        url: 'https://github.com/erostova',
      },
      {
        network: 'LinkedIn',
        username: 'elena-rostova',
        url: 'https://www.linkedin.com/in/elena-rostova',
      },
    ],
  },
  work: [
    {
      name: 'Stratos Cloud',
      position: 'Principal Engineer',
      url: 'https://stratos.example.com',
      startDate: '2021-03',
      endDate: '',
      location: 'San Francisco, CA',
      summary: 'Tech lead for multi-region consensus engine.',
      highlights: [
        'Reduced p99 replication tail latency by 44% across 12 regions',
        'Mentored 8 senior engineers and led architecture reviews',
      ],
    },
    {
      name: 'Nimbus Data',
      position: 'Senior Software Engineer',
      startDate: '2018-06',
      endDate: '2021-02',
      location: 'Seattle, WA',
      summary: 'Built streaming ingestion pipelines.',
      highlights: ['Scaled Kafka ingestion to 4M events/sec'],
    },
  ],
  education: [
    {
      institution: 'University of California, Berkeley',
      url: 'https://berkeley.edu',
      area: 'Computer Science',
      studyType: 'M.S.',
      startDate: '2016-09',
      endDate: '2018-05',
      score: '3.95',
      courses: ['Distributed Systems', 'Database Internals'],
    },
  ],
  skills: [
    {
      name: 'Systems & Languages',
      level: 'Expert',
      keywords: ['Rust', 'Go', 'TypeScript', 'C++'],
    },
    {
      name: 'Cloud Infrastructure',
      level: 'Advanced',
      keywords: ['Kubernetes', 'Terraform', 'gRPC'],
    },
  ],
  projects: [
    {
      name: 'RaftLite',
      description: 'Zero-allocation Raft consensus library in Rust.',
      highlights: ['Adopted by 3 open-source storage engines', '3.4k GitHub stars'],
      keywords: ['Rust', 'Raft', 'Tokio'],
      startDate: '2020-01',
      endDate: '2023-08',
      url: 'https://github.com/erostova/raftlite',
      roles: ['Creator', 'Lead Maintainer'],
      entity: 'Open Source',
      type: 'library',
    },
  ],
  languages: [
    { language: 'English', fluency: 'Native speaker' },
    { language: 'Russian', fluency: 'Bilingual proficiency' },
  ],
  certificates: [
    {
      name: 'Certified Kubernetes Administrator (CKA)',
      date: '2022-04',
      issuer: 'Cloud Native Computing Foundation',
      url: 'https://cncf.io/cka/verify/12345',
    },
  ],
  awards: [
    {
      title: 'Engineering Excellence Award',
      date: '2022-11',
      awarder: 'Stratos Cloud',
      summary: 'Awarded for zero-downtime storage migration.',
    },
  ],
  publications: [
    {
      name: 'Deterministic Simulation Testing for Geo-Replicated Logs',
      publisher: 'USENIX ATC',
      releaseDate: '2023-07',
      url: 'https://example.org/papers/dst-logs',
      summary: 'Presents fault-injection techniques for consensus verification.',
    },
  ],
  volunteer: [
    {
      organization: 'Women Who Code SF',
      position: 'Workshop Lead',
      url: 'https://womenwhocode.com',
      startDate: '2019-01',
      endDate: '',
      summary: 'Organized monthly systems programming study groups.',
      highlights: ['Coached 60+ engineers preparing for systems design interviews'],
    },
  ],
  interests: [
    {
      name: 'Mountaineering',
      keywords: ['Alpine climbing', 'Backcountry skiing'],
    },
  ],
  references: [
    {
      name: 'Dr. Marcus Vance',
      reference:
        'Elena is one of the strongest distributed systems engineers I have worked with in twenty years.',
    },
  ],
});

describe('JSON Resume v1 importer & exporter', () => {
  describe('date helpers', () => {
    it('formats ISO and partial dates cleanly and converts back to ISO YYYY-MM', () => {
      expect(formatDateFromJson('2020-01')).toBe('Jan 2020');
      expect(formatDateFromJson('2020-01-15')).toBe('2020-01-15');
      expect(formatDateFromJson('2021-09')).toBe('Sep 2021');
      expect(formatDateFromJson('2019')).toBe('2019');
      expect(formatDateFromJson('Present')).toBe('');

      expect(parseDateToDateFields('2016-09')).toEqual({ month: 'Sep', year: '2016' });
      expect(parseDateToDateFields('May 2020')).toEqual({ month: 'May', year: '2020' });
      expect(parseDateToDateFields('2018')).toEqual({ month: '', year: '2018' });

      expect(formatToJsonResumeDate('Jan 2020')).toBe('2020-01');
      expect(formatToJsonResumeDate('2020-01-15')).toBe('2020-01-15');
      expect(formatToJsonResumeDate({ month: 'Sep', year: '2016' })).toBe('2016-09');
      expect(formatToJsonResumeDate('2019')).toBe('2019');
      expect(formatToJsonResumeDate('Present')).toBe('');
    });
  });

  describe('parseJsonResumeString & hasRecognizedJsonResumeFields', () => {
    it('rejects empty, malformed, array, and unrecognized JSON objects', () => {
      expect(() => parseJsonResumeString('')).toThrow(/empty/i);
      expect(() => parseJsonResumeString('{bad json')).toThrow(/invalid json/i);
      expect(() => parseJsonResumeString('["not", "an", "object"]')).toThrow(/json object/i);

      const parsedUnrecognized = parseJsonResumeString('{"foo": "bar"}');
      expect(hasRecognizedJsonResumeFields(parsedUnrecognized)).toBe(false);
    });

    it('accepts valid JSON Resume objects with basics or standard sections', () => {
      const parsed = parseJsonResumeString(JSON.stringify(buildFullJsonResumeFixture()));
      expect(hasRecognizedJsonResumeFields(parsed)).toBe(true);
    });
  });

  describe('importJsonResume', () => {
    it('maps all 12 JSON Resume v1 sections into IResume with correct SectionType, enabled=true, and sectionOrder', () => {
      const fixture = buildFullJsonResumeFixture();
      const resume = importJsonResume(fixture);

      expect(resume.title).toBe('Elena Rostova — Principal Distributed Systems Engineer');
      expect(resume.summary).toContain('Distributed systems architect');
      expect(resume.content.basics.name).toBe('Elena Rostova');
      expect(resume.content.basics.label).toBe('Principal Distributed Systems Engineer');
      expect(resume.content.basics.email).toBe('elena.rostova@example.com');
      expect(resume.content.basics.phone).toBe('+1 (415) 555-0184');
      expect(resume.content.basics.url).toBe('https://elenarostova.dev');
      expect(resume.content.basics.location).toEqual({
        address: '742 Evergreen Terrace',
        postalCode: '94107',
        city: 'San Francisco',
        countryCode: 'US',
        region: 'CA',
      });
      expect(resume.content.basics.profiles).toHaveLength(2);

      const expectedSectionTypes: SectionType[] = [
        SectionType.WORK,
        SectionType.EDUCATION,
        SectionType.SKILLS,
        SectionType.PROJECTS,
        SectionType.LANGUAGES,
        SectionType.CERTIFICATES,
        SectionType.AWARDS,
        SectionType.PUBLICATIONS,
        SectionType.ORGANIZATIONS, // mapped from volunteer
        SectionType.INTERESTS,
        SectionType.REFERENCES,
      ];

      expect(resume.content.sections.map((s) => s.type)).toEqual(expectedSectionTypes);
      expect(resume.content.sections.every((s) => s.enabled === true)).toBe(true);
      expect(resume.content.sectionOrder).toEqual(
        resume.content.sections.map((s) => s.id)
      );

      // Verify work item mapping (ongoing role has current: true)
      const workSec = resume.content.sections.find((s) => s.type === SectionType.WORK)!;
      expect(workSec.content).toHaveLength(2);
      expect(workSec.content[0]).toMatchObject({
        enabled: true,
        name: 'Stratos Cloud',
        company: 'Stratos Cloud',
        position: 'Principal Engineer',
        startDate: 'Mar 2021',
        endDate: '',
        current: true,
        location: 'San Francisco, CA',
        highlights: [
          'Reduced p99 replication tail latency by 44% across 12 regions',
          'Mentored 8 senior engineers and led architecture reviews',
        ],
      });

      // Verify education mapping
      const eduSec = resume.content.sections.find((s) => s.type === SectionType.EDUCATION)!;
      expect(eduSec.content[0]).toMatchObject({
        enabled: true,
        institution: 'University of California, Berkeley',
        degree: 'M.S.',
        field: 'Computer Science',
        startDate: { month: 'Sep', year: '2016' },
        endDate: { month: 'May', year: '2018' },
        score: '3.95',
        courses: ['Distributed Systems', 'Database Internals'],
      });

      // Verify volunteer -> organizations mapping
      const orgSec = resume.content.sections.find(
        (s) => s.type === SectionType.ORGANIZATIONS
      )!;
      expect(orgSec.title).toBe('Organizations');
      expect(orgSec.content[0]).toMatchObject({
        enabled: true,
        name: 'Women Who Code SF',
        organization: 'Women Who Code SF',
        position: 'Workshop Lead',
        startDate: 'Jan 2019',
        current: true,
      });

      // Verify skills, projects, languages, certificates, awards, publications, interests, references
      const skillsSec = resume.content.sections.find((s) => s.type === SectionType.SKILLS)!;
      expect(skillsSec.content[0]).toMatchObject({
        name: 'Systems & Languages',
        level: 'Expert',
        subSkills: ['Rust', 'Go', 'TypeScript', 'C++'],
      });

      const projSec = resume.content.sections.find((s) => s.type === SectionType.PROJECTS)!;
      expect(projSec.content[0]).toMatchObject({
        name: 'RaftLite',
        technologies: ['Rust', 'Raft', 'Tokio'],
        url: 'https://github.com/erostova/raftlite',
      });

      const refSec = resume.content.sections.find((s) => s.type === SectionType.REFERENCES)!;
      expect(refSec.content[0]).toMatchObject({
        name: 'Dr. Marcus Vance',
        reference: expect.stringContaining('strongest distributed systems engineers'),
      });
    });
  });

  describe('round-trip export -> import preservation', () => {
    it('preserves all content, custom sectionOrder, and metadata across exportJsonResume -> importJsonResume', () => {
      const originalResume: IResume = {
        title: 'Jordan Patel — Staff Frontend Architect',
        templateId: 'professional',
        summary: 'Frontend platform lead focused on design systems and web performance.',
        content: {
          basics: {
            name: 'Jordan Patel',
            label: 'Staff Frontend Architect',
            email: 'jordan.patel@example.com',
            phone: '(206) 555-0149',
            url: 'https://jordanpatel.io',
            summary: 'Frontend platform lead focused on design systems and web performance.',
            location: {
              address: '100 Pine St',
              postalCode: '98101',
              city: 'Seattle',
              countryCode: 'US',
              region: 'WA',
            },
            profiles: [
              {
                network: 'GitHub',
                username: 'jpatel',
                url: 'https://github.com/jpatel',
              },
            ],
          },
          // Deliberately non-default section order (Projects before Work before Skills...)
          sections: [
            {
              id: 'sec-projects',
              type: SectionType.PROJECTS,
              title: 'Projects',
              enabled: true,
              content: [
                {
                  id: 'proj-1',
                  enabled: true,
                  name: 'Prism Design System',
                  description: 'Accessible multi-brand component library.',
                  highlights: ['Adopted by 14 product teams'],
                  technologies: ['React', 'TypeScript', 'Tailwind CSS'],
                  startDate: 'Feb 2022',
                  endDate: 'Nov 2023',
                  url: 'https://github.com/jpatel/prism',
                },
              ],
            },
            {
              id: 'sec-work',
              type: SectionType.WORK,
              title: 'Professional Experience',
              enabled: true,
              content: [
                {
                  id: 'work-1',
                  enabled: true,
                  name: 'Vanguard Web',
                  company: 'Vanguard Web',
                  position: 'Staff Frontend Architect',
                  startDate: 'Jan 2021',
                  endDate: '',
                  current: true,
                  location: 'Seattle, WA',
                  description: 'Lead architect for core web platform.',
                  highlights: ['Improved Core Web Vitals LCP by 38%'],
                },
              ],
            },
            {
              id: 'sec-edu',
              type: SectionType.EDUCATION,
              title: 'Education',
              enabled: true,
              content: [
                {
                  id: 'edu-1',
                  enabled: true,
                  institution: 'University of Washington',
                  degree: 'B.S.',
                  field: 'Informatics',
                  startDate: { month: 'Sep', year: '2013' },
                  endDate: { month: 'Jun', year: '2017' },
                  score: '3.88',
                  location: 'Seattle, WA',
                  description: 'Dean’s List all quarters',
                },
              ],
            },
            {
              id: 'sec-skills',
              type: SectionType.SKILLS,
              title: 'Skills',
              enabled: true,
              content: [
                {
                  id: 'skill-1',
                  enabled: true,
                  name: 'Frontend Architecture',
                  level: 'Expert',
                  subSkills: ['React', 'TypeScript', 'GraphQL'],
                },
              ],
            },
            {
              id: 'sec-langs',
              type: SectionType.LANGUAGES,
              title: 'Languages',
              enabled: true,
              content: [
                {
                  id: 'lang-1',
                  enabled: true,
                  name: 'English',
                  language: 'English',
                  level: 'Native',
                  fluency: 'Native',
                },
              ],
            },
            {
              id: 'sec-certs',
              type: SectionType.CERTIFICATES,
              title: 'Certifications',
              enabled: true,
              content: [
                {
                  id: 'cert-1',
                  enabled: true,
                  name: 'W3C Web Accessibility Specialist',
                  issuer: 'IAAP',
                  date: 'May 2022',
                  url: 'https://iaap.example.org/cert/99',
                },
              ],
            },
            {
              id: 'sec-awards',
              type: SectionType.AWARDS,
              title: 'Awards',
              enabled: true,
              content: [
                {
                  id: 'award-1',
                  enabled: true,
                  name: 'Hackathon Grand Prize',
                  title: 'Hackathon Grand Prize',
                  issuer: 'Vanguard Web',
                  date: 'Oct 2022',
                  description: 'Built real-time accessibility inspector.',
                },
              ],
            },
            {
              id: 'sec-pubs',
              type: SectionType.PUBLICATIONS,
              title: 'Publications',
              enabled: true,
              content: [
                {
                  id: 'pub-1',
                  enabled: true,
                  title: 'Zero-Runtime Design Tokens at Scale',
                  publisher: 'Frontend Quarterly',
                  date: 'Aug 2023',
                  url: 'https://example.com/articles/tokens',
                  description: 'Deep dive into CSS custom property pipelines.',
                },
              ],
            },
            {
              id: 'sec-orgs',
              type: SectionType.ORGANIZATIONS,
              title: 'Organizations',
              enabled: true,
              content: [
                {
                  id: 'org-1',
                  enabled: true,
                  name: 'Seattle JS',
                  organization: 'Seattle JS',
                  position: 'Co-Organizer',
                  startDate: 'Mar 2020',
                  endDate: '',
                  current: true,
                  description: 'Community meetup for 2,500+ developers.',
                  highlights: ['Hosted 30+ speaker sessions'],
                },
              ],
            },
            {
              id: 'sec-interests',
              type: SectionType.INTERESTS,
              title: 'Interests',
              enabled: true,
              content: [
                {
                  id: 'int-1',
                  enabled: true,
                  name: 'Analog Photography',
                  keywords: ['35mm Film', 'Darkroom Printing'],
                },
              ],
            },
            {
              id: 'sec-refs',
              type: SectionType.REFERENCES,
              title: 'References',
              enabled: true,
              content: [
                {
                  id: 'ref-1',
                  enabled: true,
                  name: 'Claire Nguyen',
                  description: 'Jordan elevated engineering standards across our entire org.',
                  reference: 'Jordan elevated engineering standards across our entire org.',
                },
              ],
            },
          ],
          sectionOrder: [
            'sec-projects',
            'sec-work',
            'sec-edu',
            'sec-skills',
            'sec-langs',
            'sec-certs',
            'sec-awards',
            'sec-pubs',
            'sec-orgs',
            'sec-interests',
            'sec-refs',
          ],
        },
      };

      const exported = exportJsonResume(originalResume);
      expect(exported.$schema).toBe(JSON_RESUME_SCHEMA_V1);

      // Re-import from serialized JSON string to verify true file round-trip
      const serialized = JSON.stringify(exported, null, 2);
      const parsedBack = parseJsonResumeString(serialized);
      const roundTripped = importJsonResume(parsedBack);

      expect(roundTripped.title).toBe(originalResume.title);
      expect(roundTripped.templateId).toBe('professional');
      expect(roundTripped.summary).toBe(originalResume.summary);
      expect(roundTripped.content.basics).toMatchObject({
        name: 'Jordan Patel',
        label: 'Staff Frontend Architect',
        email: 'jordan.patel@example.com',
        phone: '(206) 555-0149',
        url: 'https://jordanpatel.io',
        location: {
          address: '100 Pine St',
          postalCode: '98101',
          city: 'Seattle',
          countryCode: 'US',
          region: 'WA',
        },
      });
      expect(roundTripped.content.basics.profiles).toEqual(
        originalResume.content.basics.profiles
      );

      // Section order preserved across round-trip!
      expect(roundTripped.content.sections.map((s) => s.type)).toEqual(
        originalResume.content.sections.map((s) => s.type)
      );
      expect(roundTripped.content.sectionOrder).toEqual(
        roundTripped.content.sections.map((s) => s.id)
      );

      // Verify key section contents survived intact
      const rtProjects = roundTripped.content.sections[0].content[0];
      expect(rtProjects).toMatchObject({
        name: 'Prism Design System',
        description: 'Accessible multi-brand component library.',
        highlights: ['Adopted by 14 product teams'],
        technologies: ['React', 'TypeScript', 'Tailwind CSS'],
        startDate: 'Feb 2022',
        endDate: 'Nov 2023',
        url: 'https://github.com/jpatel/prism',
      });

      const rtWork = roundTripped.content.sections[1].content[0];
      expect(rtWork).toMatchObject({
        name: 'Vanguard Web',
        position: 'Staff Frontend Architect',
        startDate: 'Jan 2021',
        endDate: '',
        current: true,
        location: 'Seattle, WA',
        description: 'Lead architect for core web platform.',
        highlights: ['Improved Core Web Vitals LCP by 38%'],
      });

      const rtEdu = roundTripped.content.sections[2].content[0];
      expect(rtEdu).toMatchObject({
        institution: 'University of Washington',
        degree: 'B.S.',
        field: 'Informatics',
        startDate: { month: 'Sep', year: '2013' },
        endDate: { month: 'Jun', year: '2017' },
        score: '3.88',
        location: 'Seattle, WA',
        description: 'Dean’s List all quarters',
      });

      const rtOrgs = roundTripped.content.sections[8].content[0];
      expect(rtOrgs).toMatchObject({
        name: 'Seattle JS',
        position: 'Co-Organizer',
        startDate: 'Mar 2020',
        current: true,
        highlights: ['Hosted 30+ speaker sessions'],
      });
    });

    it('omits disabled sections and disabled items when exporting to JSON Resume', () => {
      const resume: IResume = {
        title: 'Selective Export',
        summary: '',
        content: {
          basics: {
            name: 'Alex Kim',
            label: 'Engineer',
            email: 'alex@example.com',
            phone: '',
            summary: '',
            location: { address: '', postalCode: '', city: '', countryCode: '' },
          },
          sections: [
            {
              id: 's-work',
              type: SectionType.WORK,
              title: 'Work',
              enabled: true,
              content: [
                {
                  id: 'w-on',
                  enabled: true,
                  name: 'Active Co',
                  position: 'Developer',
                  startDate: 'Jan 2022',
                  endDate: '',
                  current: true,
                  description: 'Active item',
                },
                {
                  id: 'w-off',
                  enabled: false,
                  name: 'Hidden Co',
                  position: 'Intern',
                  startDate: 'Jan 2020',
                  endDate: 'Dec 2020',
                  description: 'Disabled item',
                },
              ],
            },
            {
              id: 's-awards',
              type: SectionType.AWARDS,
              title: 'Awards',
              enabled: false,
              content: [{ id: 'a-1', enabled: true, name: 'Hidden Section Award' }],
            },
          ],
          sectionOrder: ['s-work', 's-awards'],
        },
      };

      const exported = exportJsonResume(resume);
      expect(exported.work).toHaveLength(1);
      expect(exported.work?.[0].name).toBe('Active Co');
      expect(exported.awards).toBeUndefined();
    });

    it('builds safe filenames and triggers anchor download in downloadResumeAsJson', () => {
      const resume = importJsonResume(buildFullJsonResumeFixture());
      expect(buildJsonResumeFilename(resume)).toBe(
        'elena-rostova-principal-distributed-systems-engineer.json'
      );

      const clickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});

      const { filename, json } = downloadResumeAsJson(resume);
      expect(filename).toBe(
        'elena-rostova-principal-distributed-systems-engineer.json'
      );
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(json).basics.name).toBe('Elena Rostova');

      clickSpy.mockRestore();
    });
  });
});

describe('Plain-text & LinkedIn heuristic parser (parseResumeText)', () => {
  it('extracts date ranges across common formats including Present/Current', () => {
    expect(extractDateRangeFromLine('Jan 2020 - Present · 4 yrs 3 mos')).toMatchObject({
      startDate: 'Jan 2020',
      endDate: '',
      current: true,
      remainingText: '',
    });

    expect(
      extractDateRangeFromLine('Acme Corp | Sep 2017 – Feb 2020')
    ).toMatchObject({
      startDate: 'Sep 2017',
      endDate: 'Feb 2020',
      current: false,
      remainingText: 'Acme Corp',
    });

    expect(extractDateRangeFromLine('2015 - 2019')).toMatchObject({
      startDate: '2015',
      endDate: '2019',
      current: false,
      remainingText: '',
    });
  });

  it('parses a traditional plain-text resume with uppercase headings, date ranges, roles, and bullets', () => {
    const resumeText = `
Maya Lin
Staff Backend Engineer
maya.lin@example.com | +1 (650) 555-0199 | San Jose, CA
https://mayalin.dev | github.com/mayalin | linkedin.com/in/mayalin

PROFESSIONAL SUMMARY
Backend systems engineer specializing in payment ledgers, high-throughput APIs, and observability.

WORK EXPERIENCE
Senior Software Engineer at FinPay Technologies
Jan 2021 - Present
San Francisco, CA
• Architected idempotent settlement service processing $4B annually
• Cut database query load by 52% via read-through Redis caching

Backend Software Engineer | Orbit Commerce
Jun 2018 - Dec 2020
- Built webhook delivery engine with exponential backoff and dead-letter queues
- Collaborated with product and security teams on SOC2 compliance

EDUCATION
Stanford University | B.S. in Computer Science | Sep 2014 - Jun 2018
GPA: 3.92

TECHNICAL SKILLS
Languages: Go, TypeScript, Python, SQL
Infrastructure: Kubernetes, PostgreSQL, Redis, Kafka

PROJECTS
LedgerFlow | Go, PostgreSQL | https://github.com/mayalin/ledgerflow
• Double-entry accounting engine with serializable isolation guarantees

CERTIFICATIONS
AWS Certified Solutions Architect – Associate | Amazon Web Services | Mar 2022
    `.trim();

    const parsed = parseResumeText(resumeText);

    expect(parsed.content.basics.name).toBe('Maya Lin');
    expect(parsed.content.basics.label).toBe('Staff Backend Engineer');
    expect(parsed.content.basics.email).toBe('maya.lin@example.com');
    expect(parsed.content.basics.phone).toContain('650');
    expect(parsed.content.basics.url).toBe('https://mayalin.dev');
    expect(parsed.content.basics.location.city).toBe('San Jose');
    expect(parsed.content.basics.location.region).toBe('CA');
    expect(parsed.content.basics.profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ network: 'GitHub', url: 'https://github.com/mayalin' }),
        expect.objectContaining({
          network: 'LinkedIn',
          url: 'https://linkedin.com/in/mayalin',
        }),
      ])
    );
    expect(parsed.summary).toContain('payment ledgers');

    const sectionTypes = parsed.content.sections.map((s) => s.type);
    expect(sectionTypes).toEqual([
      SectionType.WORK,
      SectionType.EDUCATION,
      SectionType.SKILLS,
      SectionType.PROJECTS,
      SectionType.CERTIFICATES,
    ]);
    expect(parsed.content.sections.every((s) => s.enabled)).toBe(true);
    expect(parsed.content.sectionOrder).toEqual(
      parsed.content.sections.map((s) => s.id)
    );

    const workItems = parsed.content.sections[0].content;
    expect(workItems).toHaveLength(2);
    expect(workItems[0]).toMatchObject({
      name: 'FinPay Technologies',
      company: 'FinPay Technologies',
      position: 'Senior Software Engineer',
      startDate: 'Jan 2021',
      endDate: '',
      current: true,
      location: 'San Francisco, CA',
      highlights: [
        'Architected idempotent settlement service processing $4B annually',
        'Cut database query load by 52% via read-through Redis caching',
      ],
    });
    expect(workItems[1]).toMatchObject({
      name: 'Orbit Commerce',
      position: 'Backend Software Engineer',
      startDate: 'Jun 2018',
      endDate: 'Dec 2020',
      current: false,
    });

    const eduItems = parsed.content.sections[1].content;
    expect(eduItems[0]).toMatchObject({
      institution: 'Stanford University',
      degree: 'B.S.',
      field: 'Computer Science',
      startDate: { month: 'Sep', year: '2014' },
      endDate: { month: 'Jun', year: '2018' },
      score: '3.92',
    });

    const skillItems = parsed.content.sections[2].content;
    expect(skillItems[0]).toMatchObject({
      name: 'Languages',
      subSkills: ['Go', 'TypeScript', 'Python', 'SQL'],
    });

    const projectItems = parsed.content.sections[3].content;
    expect(projectItems[0]).toMatchObject({
      name: 'LedgerFlow',
      url: 'https://github.com/mayalin/ledgerflow',
      highlights: [
        'Double-entry accounting engine with serializable isolation guarantees',
      ],
    });

    const certItems = parsed.content.sections[4].content;
    expect(certItems[0]).toMatchObject({
      name: 'AWS Certified Solutions Architect – Associate',
      issuer: 'Amazon Web Services',
      date: 'Mar 2022',
    });
  });

  it('parses copied LinkedIn profile text with employment annotations and Licenses & Certifications', () => {
    const linkedInPaste = `
Devon Brooks
Lead Product Designer at Aurora Health
Austin, TX
500+ connections
devon.brooks@example.com · linkedin.com/in/devonbrooks

About
Human-centered product designer crafting accessible clinical workflows and mobile health apps.

Experience
Lead Product Designer
Aurora Health · Full-time
Apr 2022 - Present · 2 yrs 8 mos
Austin, TX
* Redesigned clinician intake flow, reducing charting time by 31%
* Partnered with engineering to ship a WCAG AA design token library

Senior UX Designer
CivicPulse · Full-time
May 2019 - Mar 2022 · 2 yrs 11 mos
* Led end-to-end discovery and usability testing across 40+ municipalities

Education
Rhode Island School of Design
BFA, Industrial Design
2015 - 2019

Licenses & Certifications
Interaction Design Specialization
Coursera | Sep 2020

Top Skills
Figma · Design Systems · Accessibility · Prototyping

Languages
English (Native), Spanish (Professional working)

Volunteer Experience
Design Mentor at Out in Tech
Jan 2021 - Present
• Mentored 15 early-career designers on portfolio reviews
    `.trim();

    const parsed = parseResumeText(linkedInPaste);

    expect(parsed.content.basics.name).toBe('Devon Brooks');
    expect(parsed.content.basics.label).toBe('Lead Product Designer at Aurora Health');
    expect(parsed.content.basics.email).toBe('devon.brooks@example.com');
    expect(parsed.summary).toContain('Human-centered product designer');

    const workSec = parsed.content.sections.find((s) => s.type === SectionType.WORK)!;
    expect(workSec.content).toHaveLength(2);
    expect(workSec.content[0]).toMatchObject({
      name: 'Aurora Health',
      position: 'Lead Product Designer',
      startDate: 'Apr 2022',
      current: true,
      highlights: [
        'Redesigned clinician intake flow, reducing charting time by 31%',
        'Partnered with engineering to ship a WCAG AA design token library',
      ],
    });

    const certSec = parsed.content.sections.find(
      (s) => s.type === SectionType.CERTIFICATES
    )!;
    expect(certSec.content[0].name).toBe('Interaction Design Specialization');

    const langSec = parsed.content.sections.find(
      (s) => s.type === SectionType.LANGUAGES
    )!;
    expect(langSec.content).toHaveLength(2);
    expect(langSec.content[0]).toMatchObject({ name: 'English', level: 'Native' });

    const volunteerSec = parsed.content.sections.find(
      (s) => s.type === SectionType.ORGANIZATIONS
    )!;
    expect(volunteerSec.content[0]).toMatchObject({
      name: 'Out in Tech',
      position: 'Design Mentor',
      startDate: 'Jan 2021',
      current: true,
    });
  });

  it('throws a friendly error when pasted text is empty', () => {
    expect(() => parseResumeText('   ')).toThrow(/paste resume/i);
  });
});
