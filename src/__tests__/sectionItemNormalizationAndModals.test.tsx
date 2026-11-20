import React, { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ResumeEditor, { getItemDisplayLines } from "../components/ResumeEditor";
import SectionEditors, { parseMonthYearDateValue } from "../components/sections";
import EducationForm from "../components/Education-form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { TemplateProvider } from "../components/templates/shared/TemplateContext";
import { SectionRenderer } from "../components/templates/shared/SectionRenderer";
import { DateRange } from "../components/templates/shared/DateRange";
import { ModernTemplate } from "../components/templates/ModernTemplate";
import { StartupTemplate } from "../components/templates/StartupTemplate";
import { TimelineTemplate } from "../components/templates/TimelineTemplate";
import { formatItemDateRange } from "../components/templates/templateHelpers";
import {
  normalizeResume,
  normalizeSectionItem,
} from "../utils/resumeNormalizer";
import { EducationItem, IResume, ISection, SectionType } from "../types/resume";

jest.mock("react-resizable-panels", () => ({
  PanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  Panel: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  PanelResizeHandle: ({ children, ...props }: any) => (
    <div role="separator" {...props}>
      {children}
    </div>
  ),
}));

jest.mock("../services/resume.service", () => ({
  resumeService: {
    updateResume: jest.fn(),
    createResume: jest.fn(),
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
    exportResumeTxt: jest.fn(),
  },
}));

describe("Section Item Normalization, Unified Modals, Select Sync & Present Gating", () => {
  describe("Canonical migration & legacy alias cleanup (Req 1 & 2)", () => {
    it("migrates legacy aliases across all section kinds into canonical keys and removes stale aliases", () => {
      const rawResume: IResume = {
        title: "Legacy Resume",
        content: {
          basics: { name: "Taylor Quinn" },
          sections: [
            {
              id: "sec-work",
              type: SectionType.WORK,
              title: "Work Experience",
              content: [
                {
                  id: "w1",
                  name: "Legacy Employer LLC",
                  role: "Staff Engineer",
                  summary: "Built distributed pipelines",
                  website: "https://legacy.example.com",
                  isCurrent: true,
                } as any,
              ],
            },
            {
              id: "sec-edu",
              type: SectionType.EDUCATION,
              title: "Education",
              content: [
                {
                  id: "e1",
                  studyType: "B.S.",
                  area: "Computer Science",
                  school: "Georgia Tech",
                  score: "3.95/4.0",
                  link: "https://gatech.edu",
                } as any,
              ],
            },
            {
              id: "sec-lang",
              type: SectionType.LANGUAGES,
              title: "Languages",
              content: [
                { id: "l1", language: "Spanish", fluency: "Fluent" } as any,
              ],
            },
            {
              id: "sec-course",
              type: SectionType.COURSES,
              title: "Courses",
              content: [
                {
                  id: "c1",
                  course: "Distributed Systems",
                  school: "MIT",
                } as any,
              ],
            },
            {
              id: "sec-award",
              type: SectionType.AWARDS,
              title: "Awards",
              content: [
                {
                  id: "a1",
                  title: "Engineering Excellence",
                  awarder: "ACM",
                } as any,
              ],
            },
            {
              id: "sec-ach",
              type: SectionType.ACHIVEMENTS,
              title: "Achievements",
              content: [
                {
                  id: "ac1",
                  title: "Patent Holder",
                  awarder: "USPTO",
                } as any,
              ],
            },
            {
              id: "sec-org",
              type: SectionType.ORGANIZATIONS,
              title: "Organizations",
              content: [
                {
                  id: "o1",
                  organization: "Women Who Code",
                  role: "Chapter Lead",
                } as any,
              ],
            },
            {
              id: "sec-ref",
              type: SectionType.REFERENCES,
              title: "References",
              content: [
                {
                  id: "r1",
                  name: "Sam Rivera",
                  email: "sam@example.com",
                  phone: "555-0142",
                  reference: "Outstanding technical leader.",
                } as any,
              ],
            },
            {
              id: "sec-custom",
              type: SectionType.CUSTOM,
              title: "Volunteering",
              isCustom: true,
              content: [
                {
                  id: "cu1",
                  name: "Mentor",
                  summary: "Coached 25 engineers.",
                } as any,
              ],
            },
          ],
          sectionOrder: [],
        },
      };

      const start = performance.now();
      const normalized = normalizeResume(rawResume);
      const elapsedMs = performance.now() - start;
      expect(elapsedMs).toBeLessThan(100);

      const byId = Object.fromEntries(
        normalized.content.sections.map((s) => [s.id, s.content[0] as any])
      );

      expect(byId["sec-work"]).toMatchObject({
        company: "Legacy Employer LLC",
        position: "Staff Engineer",
        description: "Built distributed pipelines",
        url: "https://legacy.example.com",
        current: true,
      });
      expect(byId["sec-work"].name).toBeUndefined();
      expect(byId["sec-work"].role).toBeUndefined();
      expect(byId["sec-work"].isCurrent).toBeUndefined();

      expect(byId["sec-edu"]).toMatchObject({
        degree: "B.S.",
        field: "Computer Science",
        institution: "Georgia Tech",
        gpa: "3.95/4.0",
        url: "https://gatech.edu",
      });
      expect(byId["sec-edu"].school).toBeUndefined();
      expect(byId["sec-edu"].score).toBeUndefined();

      expect(byId["sec-lang"]).toMatchObject({
        name: "Spanish",
        level: "Fluent",
      });
      expect(byId["sec-lang"].language).toBeUndefined();
      expect(byId["sec-lang"].fluency).toBeUndefined();

      expect(byId["sec-course"]).toMatchObject({
        name: "Distributed Systems",
        institution: "MIT",
      });
      expect(byId["sec-course"].course).toBeUndefined();

      expect(byId["sec-award"]).toMatchObject({
        name: "Engineering Excellence",
        issuer: "ACM",
      });
      expect(byId["sec-award"].title).toBeUndefined();
      expect(byId["sec-award"].awarder).toBeUndefined();

      expect(byId["sec-ach"]).toMatchObject({
        name: "Patent Holder",
        issuer: "USPTO",
      });

      expect(byId["sec-org"]).toMatchObject({
        name: "Women Who Code",
        position: "Chapter Lead",
      });
      expect(byId["sec-org"].organization).toBeUndefined();

      expect(byId["sec-ref"]).toMatchObject({
        name: "Sam Rivera",
        contact: "sam@example.com · 555-0142",
        description: "Outstanding technical leader.",
      });
      expect(byId["sec-ref"].email).toBeUndefined();
      expect(byId["sec-ref"].phone).toBeUndefined();
      expect(byId["sec-ref"].reference).toBeUndefined();

      expect(byId["sec-custom"]).toMatchObject({
        title: "Mentor",
        description: "Coached 25 engineers.",
      });
      expect(byId["sec-custom"].name).toBeUndefined();
    });
  });

  describe("Inline edit + modal round-trip & clearing fields (AC 1 & AC 2)", () => {
    it("AC 1: editing a work company inline in SectionRenderer and saving the modal in sections.tsx keeps the inline value", () => {
      const Harness = () => {
        const [resume, setResume] = useState<IResume>(() =>
          normalizeResume({
            title: "Roundtrip Resume",
            content: {
              basics: { name: "Jordan" },
              sections: [
                {
                  id: "sec-work",
                  type: SectionType.WORK,
                  title: "Experience",
                  content: [
                    {
                      id: "w-1",
                      name: "Old Legacy Corp",
                      position: "Senior Developer",
                      startDate: "Jan 2022",
                      current: true,
                    } as any,
                  ],
                },
              ],
              sectionOrder: ["sec-work"],
            },
          })
        );
        const [modalOpen, setModalOpen] = useState(false);

        const workSection = resume.content.sections[0];

        return (
          <div>
            <TemplateProvider
              resume={resume}
              onChange={setResume}
              readOnly={false}
            >
              <SectionRenderer sections={[workSection]} />
            </TemplateProvider>
            <button type="button" onClick={() => setModalOpen(true)}>
              Open Work Modal
            </button>
            {modalOpen && (
              <SectionEditors
                content={{
                  type: SectionType.WORK,
                  item: workSection.content[0],
                }}
                onSave={(_type, item) => {
                  const normalizedItem = normalizeSectionItem(workSection, item);
                  setResume((prev) => ({
                    ...prev,
                    content: {
                      ...prev.content,
                      sections: [
                        {
                          ...workSection,
                          content: [normalizedItem],
                        },
                      ],
                    },
                  }));
                  setModalOpen(false);
                }}
                onClose={() => setModalOpen(false)}
              />
            )}
          </div>
        );
      };

      render(<Harness />);

      // Edit company inline in SectionRenderer
      fireEvent.click(screen.getByText("Old Legacy Corp"));
      const inlineInput = screen.getByDisplayValue("Old Legacy Corp");
      fireEvent.change(inlineInput, { target: { value: "Inline Edited Inc" } });
      fireEvent.blur(inlineInput);

      expect(screen.getByText("Inline Edited Inc")).toBeInTheDocument();

      // Open modal in sections.tsx -> verify it shows inline company -> save modal
      fireEvent.click(screen.getByRole("button", { name: "Open Work Modal" }));
      const companyModalInput = screen.getByLabelText("Company");
      expect(companyModalInput).toHaveValue("Inline Edited Inc");

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      expect(screen.getByText("Inline Edited Inc")).toBeInTheDocument();
      expect(screen.queryByText("Old Legacy Corp")).not.toBeInTheDocument();
    });

    it("AC 2: clearing an inline field leaves the preview empty instead of restoring a stale alias value", () => {
      const ClearHarness = ({ TemplateComp }: { TemplateComp: any }) => {
        const [resume, setResume] = useState<IResume>({
          title: "Clear Field Test",
          content: {
            basics: { name: "Jordan" },
            sections: [
              {
                id: "sec-work",
                type: SectionType.WORK,
                title: "Experience",
                content: [
                  {
                    id: "w-clear",
                    company: "Initial Company",
                    name: "Stale Alias Company",
                    organization: "Stale Org Alias",
                    position: "Architect",
                  } as any,
                ],
              },
            ],
            sectionOrder: ["sec-work"],
          },
        });

        return (
          <TemplateComp
            resume={resume}
            onChange={setResume}
            readOnly={false}
          />
        );
      };

      const { unmount } = render(<ClearHarness TemplateComp={ModernTemplate} />);
      fireEvent.click(screen.getByText("Initial Company"));
      const input = screen.getByDisplayValue("Initial Company");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.blur(input);

      expect(screen.queryByText("Initial Company")).not.toBeInTheDocument();
      expect(screen.queryByText("Stale Alias Company")).not.toBeInTheDocument();
      expect(screen.queryByText("Stale Org Alias")).not.toBeInTheDocument();
      unmount();

      // Also verify StartupTemplate and TimelineTemplate respect cleared canonical fields
      const { unmount: unmountStartup } = render(
        <StartupTemplate
          resume={{
            title: "Startup Clear",
            content: {
              basics: { name: "Jordan" },
              sections: [
                {
                  id: "sec-w",
                  type: SectionType.WORK,
                  title: "Experience",
                  content: [
                    {
                      id: "w1",
                      company: "",
                      name: "Stale Startup Alias",
                      position: "CTO",
                    } as any,
                  ],
                },
              ],
              sectionOrder: ["sec-w"],
            },
          }}
          readOnly
        />
      );
      expect(screen.queryByText("Stale Startup Alias")).not.toBeInTheDocument();
      unmountStartup();

      render(
        <TimelineTemplate
          resume={{
            title: "Timeline Clear",
            content: {
              basics: { name: "Jordan" },
              sections: [
                {
                  id: "sec-w",
                  type: SectionType.WORK,
                  title: "Experience",
                  content: [
                    {
                      id: "w1",
                      company: "",
                      name: "Stale Timeline Alias",
                      position: "CTO",
                    } as any,
                  ],
                },
              ],
              sectionOrder: ["sec-w"],
            },
          }}
          readOnly
        />
      );
      expect(screen.queryByText("Stale Timeline Alias")).not.toBeInTheDocument();
    });
  });

  describe("Inline edits immediately update section cards in ResumeEditor (AC 3)", () => {
    it("AC 3: inline edits to languages, courses, awards, achievements, and organizations immediately update section cards in ResumeEditor", () => {
      const initialResume: IResume = {
        _id: "res-ac3",
        title: "Multi-Section Resume",
        content: {
          basics: { name: "Casey Morgan" },
          sections: [
            {
              id: "sec-lang",
              type: SectionType.LANGUAGES,
              title: "Languages",
              content: [{ id: "lang-1", language: "French", fluency: "Intermediate" } as any],
            },
            {
              id: "sec-course",
              type: SectionType.COURSES,
              title: "Courses",
              content: [{ id: "course-1", course: "Operating Systems", institution: "CMU" } as any],
            },
            {
              id: "sec-award",
              type: SectionType.AWARDS,
              title: "Awards",
              content: [{ id: "award-1", title: "Hackathon Winner", awarder: "TechCrunch" } as any],
            },
            {
              id: "sec-ach",
              type: SectionType.ACHIVEMENTS,
              title: "Achievements",
              content: [{ id: "ach-1", title: "Top Contributor", awarder: "CNCF" } as any],
            },
            {
              id: "sec-org",
              type: SectionType.ORGANIZATIONS,
              title: "Organizations",
              content: [{ id: "org-1", organization: "IEEE", role: "Board Member" } as any],
            },
          ],
          sectionOrder: ["sec-lang", "sec-course", "sec-award", "sec-ach", "sec-org"],
        },
      };

      render(<ResumeEditor initialResume={initialResume} onBack={jest.fn()} />);

      // Helper to edit inline text inside the live preview pane
      const editPreviewText = (oldText: string, newText: string) => {
        const matches = screen.getAllByText(oldText);
        // Click the inline-editable span in the preview (last match when card also renders it)
        const editableTarget = matches[matches.length - 1];
        fireEvent.click(editableTarget);
        const input = screen.getByDisplayValue(oldText);
        fireEvent.change(input, { target: { value: newText } });
        fireEvent.blur(input);
      };

      editPreviewText("French", "Japanese");
      editPreviewText("Operating Systems", "Compiler Design");
      editPreviewText("Hackathon Winner", "Distinguished Fellow");
      editPreviewText("Top Contributor", "Keynote Speaker");
      editPreviewText("IEEE", "Open Source Initiative");

      // Both the ResumeEditor left-panel section cards AND the right-panel preview show updated text
      expect(screen.getAllByText("Japanese").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Compiler Design").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Distinguished Fellow").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Keynote Speaker").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Open Source Initiative").length).toBeGreaterThanOrEqual(2);

      // Direct verification of getItemDisplayLines with string & numeric language levels
      expect(
        getItemDisplayLines(SectionType.LANGUAGES, { name: "Japanese", level: "Native" })
      ).toEqual({ primary: "Japanese", secondary: "Native" });
      expect(
        getItemDisplayLines(SectionType.LANGUAGES, { name: "German", level: 4 })
      ).toEqual({ primary: "German", secondary: "Level 4/5" });
    });
  });

  describe("Unified Education modal, string date preservation & ItemHeader styling (AC 4 & AC 5)", () => {
    it("AC 4: saving an education entry stores institution, degree, field, gpa, location, url, current, startDate, endDate and styles institution in ItemHeader", () => {
      const onAddContent = jest.fn();
      const eduSection: ISection = {
        id: "sec-edu",
        type: SectionType.EDUCATION,
        title: "Education",
        content: [
          {
            id: "edu-new",
            degree: "",
            institution: "",
            field: "",
            gpa: "",
            location: "",
            url: "",
            startDate: { month: "Sep", year: "2020" },
            endDate: { month: "May", year: "2024" },
            current: false,
            description: "",
          },
        ],
      };

      render(
        <SectionEditors
          content={{
            type: SectionType.EDUCATION,
            item: eduSection.content[0] as EducationItem,
          }}
          onSave={(_type, item) => onAddContent(item)}
          onClose={jest.fn()}
        />
      );

      fireEvent.change(screen.getByLabelText("Degree / Qualification"), {
        target: { value: "B.S." },
      });
      fireEvent.change(screen.getByLabelText("School / Institution"), {
        target: { value: "Stanford University" },
      });
      fireEvent.change(screen.getByLabelText("Field of Study"), {
        target: { value: "Computer Science" },
      });
      fireEvent.change(screen.getByLabelText("GPA / Score"), {
        target: { value: "3.98 / 4.0" },
      });
      fireEvent.change(screen.getByLabelText("Location"), {
        target: { value: "Stanford, CA" },
      });
      fireEvent.change(
        screen.getByLabelText("Institution / Credential URL"),
        { target: { value: "https://cs.stanford.edu" } }
      );

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      expect(onAddContent).toHaveBeenCalledTimes(1);
      const savedEdu: EducationItem = onAddContent.mock.calls[0][0];
      expect(savedEdu).toMatchObject({
        id: "edu-new",
        degree: "B.S.",
        institution: "Stanford University",
        field: "Computer Science",
        gpa: "3.98 / 4.0",
        location: "Stanford, CA",
        url: "https://cs.stanford.edu",
        startDate: { month: "Sep", year: "2020" },
        endDate: { month: "May", year: "2024" },
        current: false,
      });

      // Render in SectionRenderer to verify ItemHeader styles institution
      const resumeWithEdu: IResume = {
        title: "Edu Preview",
        content: {
          basics: { name: "Alex" },
          sections: [
            {
              id: "sec-edu",
              type: SectionType.EDUCATION,
              title: "Education",
              content: [savedEdu],
            },
          ],
          sectionOrder: ["sec-edu"],
        },
      };

      render(<ModernTemplate resume={resumeWithEdu} readOnly />);
      const institutionEl = screen.getByText("Stanford University");
      expect(institutionEl).toBeInTheDocument();
      expect(institutionEl).toHaveClass("font-medium", "text-slate-700");
      expect(screen.getByRole("link", { name: /cs\.stanford\.edu/i })).toHaveAttribute(
        "href",
        "https://cs.stanford.edu"
      );
      expect(screen.getByText(/GPA: 3\.98 \/ 4\.0/)).toBeInTheDocument();
    });

    it("AC 5: opening and saving an education entry with string dates preserves both dates instead of resetting them to empty strings", () => {
      // Standard named month-year strings
      const onSaveNamed = jest.fn();
      const { unmount } = render(
        <EducationForm
          initialContent={{
            id: "edu-str-1",
            degree: "M.S.",
            institution: "UC Berkeley",
            field: "EECS",
            startDate: "September 2019",
            endDate: "May 2021",
          }}
          onSave={onSaveNamed}
          onCancel={jest.fn()}
        />
      );

      // Select triggers display human-readable month names parsed from string dates
      expect(screen.getByRole("button", { name: "September" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2019" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "May" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2021" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      expect(onSaveNamed).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: { month: "Sep", year: "2019" },
          endDate: { month: "May", year: "2021" },
        })
      );
      unmount();

      // ISO YYYY-MM and year-only strings, plus custom freeform string
      expect(parseMonthYearDateValue("2020-08")).toEqual({
        month: "Aug",
        year: "2020",
      });
      expect(parseMonthYearDateValue("2022")).toEqual({
        month: "",
        year: "2022",
      });

      const onSaveCustom = jest.fn();
      render(
        <EducationForm
          initialContent={{
            id: "edu-str-custom",
            degree: "B.A.",
            institution: "Oxford",
            startDate: "Autumn 2017",
            endDate: "Summer 2020",
          }}
          onSave={onSaveCustom}
          onCancel={jest.fn()}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      expect(onSaveCustom).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: "Autumn 2017",
          endDate: "Summer 2020",
        })
      );
    });
  });

  describe("Controlled Select synchronization & month labels (AC 6)", () => {
    it("AC 6: synchronizes Select with prop updates and displays full human-readable month names", () => {
      const MONTHS = [
        { code: "Jan", label: "January" },
        { code: "Sep", label: "September" },
        { code: "Dec", label: "December" },
      ];

      const { rerender } = render(
        <Select value="Jan" onValueChange={jest.fn()}>
          <SelectTrigger aria-label="Start Date Month">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.code} value={m.code}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

      // Displays full label "January" instead of raw code "Jan"
      expect(
        screen.getByRole("button", { name: "Start Date Month" })
      ).toHaveTextContent("January");

      // Controlled prop update from "Jan" -> "Sep" updates displayed label immediately
      rerender(
        <Select value="Sep" onValueChange={jest.fn()}>
          <SelectTrigger aria-label="Start Date Month">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.code} value={m.code}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

      expect(
        screen.getByRole("button", { name: "Start Date Month" })
      ).toHaveTextContent("September");
    });
  });

  describe("Project & Custom ongoing toggles and Present date gating (Req 7, Req 8, AC 7)", () => {
    it("Req 7: provides ongoing status checkbox toggles on PROJECTS and CUSTOM modal forms", () => {
      const onSaveProject = jest.fn();
      const { unmount } = render(
        <SectionEditors
          content={{
            type: SectionType.PROJECTS,
            item: {
              id: "proj-1",
              name: "Open Source CLI",
              startDate: "Jan 2025",
              endDate: "",
              current: false,
            } as any,
          }}
          onSave={(_type, item) => onSaveProject(item)}
          onClose={jest.fn()}
        />
      );

      const projCheckbox = screen.getByLabelText("Currently working on this");
      expect(projCheckbox).not.toBeChecked();
      fireEvent.click(projCheckbox);
      expect(projCheckbox).toBeChecked();
      // End Date input disables when ongoing is checked
      expect(screen.getByLabelText("End Date")).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      expect(onSaveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "proj-1",
          name: "Open Source CLI",
          current: true,
        })
      );
      unmount();

      const onSaveCustom = jest.fn();
      render(
        <SectionEditors
          content={{
            type: SectionType.CUSTOM,
            item: {
              id: "cust-1",
              title: "Technical Advisor",
              startDate: "2024",
              endDate: "",
              current: false,
            } as any,
          }}
          onSave={(_type, item) => onSaveCustom(item)}
          onClose={jest.fn()}
        />
      );

      const custCheckbox = screen.getByLabelText("Currently ongoing");
      expect(custCheckbox).not.toBeChecked();
      fireEvent.click(custCheckbox);
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      expect(onSaveCustom).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "cust-1",
          title: "Technical Advisor",
          current: true,
        })
      );
    });

    it("AC 7: omits Present when startDate is set, endDate is empty, and current is false across cards, DateRange, and previews", () => {
      // 1. templateHelpers.formatItemDateRange
      expect(
        formatItemDateRange({
          startDate: "Mar 2023",
          endDate: "",
          current: false,
        })
      ).toBe("Mar 2023");
      expect(
        formatItemDateRange({
          startDate: "Mar 2023",
          endDate: "",
          current: true,
        })
      ).toBe("Mar 2023 - Present");
      expect(
        formatItemDateRange({
          startDate: "Mar 2023",
          endDate: "Present",
          current: false,
        })
      ).toBe("Mar 2023 - Present");

      // 2. ResumeEditor card subtitle (getItemDisplayLines)
      const cardSingleDate = getItemDisplayLines(SectionType.PROJECTS, {
        name: "One-off Project",
        startDate: "2024",
        endDate: "",
        current: false,
      });
      expect(cardSingleDate.secondary).toBe("2024");
      expect(cardSingleDate.secondary).not.toContain("Present");

      const cardOngoing = getItemDisplayLines(SectionType.PROJECTS, {
        name: "Active Project",
        startDate: "2024",
        endDate: "",
        current: true,
      });
      expect(cardOngoing.secondary).toBe("2024 – Present");

      // 3. DateRange direct props
      const { rerender } = render(
        <DateRange startDate="May 2023" endDate="" current={false} />
      );
      expect(screen.getByText("May 2023")).toBeInTheDocument();
      expect(screen.queryByText(/Present/)).not.toBeInTheDocument();

      rerender(
        <DateRange startDate="May 2023" endDate="Present" current={false} />
      );
      expect(screen.getByText("May 2023 - Present")).toBeInTheDocument();
    });
  });
});
