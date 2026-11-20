import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { normalizeResume } from "../utils/resumeNormalizer";
import { analyzeBulletText } from "../utils/bulletCoach";
import { IResume, SectionType } from "../types/resume";
import {
  TemplateProvider,
  useTemplateContext,
} from "../components/templates/shared/TemplateContext";
import SectionEditors from "../components/sections";
import EducationForm from "../components/Education-form";
import ResumeEditor from "../components/ResumeEditor";
import { resumeService } from "../services/resume.service";

jest.mock("react-resizable-panels", () => ({
  PanelGroup: ({ children, className }: any) => (
    <div data-testid="mock-panel-group" className={className}>
      {children}
    </div>
  ),
  Panel: ({ children, className, defaultSize, minSize }: any) => (
    <div
      data-testid="mock-panel"
      data-default-size={defaultSize}
      data-min-size={minSize}
      className={className}
    >
      {children}
    </div>
  ),
  PanelResizeHandle: ({ children, ...props }: any) => (
    <div role="separator" {...props}>
      {children}
    </div>
  ),
}));

jest.mock("../services/resume.service", () => {
  const actual = jest.requireActual("../services/resume.service");
  return {
    ...actual,
    resumeService: {
      createResume: jest.fn(),
      updateResume: jest.fn().mockResolvedValue({
        _id: "res-1",
        id: "res-1",
      }),
      coachBullet: jest.fn(),
      getShareSettings: jest.fn(),
      exportResumeTxt: jest.fn(),
    },
  };
});

describe("Grounded AI Normalization, Item ID Guards & Inline Bullet Coach", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resumeService.coachBullet as jest.Mock).mockImplementation(async (req: any) => ({
      originalText: req.text,
      rewrittenText:
        req.action === "shorten"
          ? "Engineered TypeScript APIs."
          : req.action === "improve"
          ? "Engineered TypeScript APIs to support reliable production workflows."
          : "Delivered resilient TypeScript APIs.",
      action: req.action,
      source_fact_ids: ["fact:bullet:input", "fact:skill:typescript"],
      hasMetrics: false,
      xyzPrompts: [
        {
          id: "reduced-latency",
          label: "Reduced latency",
          placeholder: "e.g. 35% or 120ms",
          clausePrefix: "reducing latency by",
        },
        {
          id: "increased-throughput",
          label: "Increased throughput",
          placeholder: "e.g. 3x or 100K+ req/s",
          clausePrefix: "increasing throughput by",
        },
        {
          id: "cut-cost",
          label: "Cut cost",
          placeholder: "e.g. 25% or $12K/mo",
          clausePrefix: "cutting cost by",
        },
      ],
    }));
  });

  describe("Section type & item ID normalization", () => {
    it("normalizes work, experience, education, skills, projects, and certifications into valid SectionType values and opens valid forms", () => {
      const rawAiResume: any = {
        _id: "ai-res-1",
        title: "Normalized AI Draft",
        summary: "Backend engineer skilled in TypeScript and PostgreSQL.",
        content: {
          basics: {
            name: "Jordan Lee",
            email: "jordan@example.com",
            label: "Backend Engineer",
          },
          sections: [
            {
              id: "sec-1",
              type: "work",
              title: "Work History",
              content: [{ company: "Acme Corp", position: "Engineer" }],
            },
            {
              id: "sec-2",
              type: "experience",
              title: "Experience",
              content: [{ company: "Beta Systems", position: "Lead Engineer" }],
            },
            {
              id: "sec-3",
              type: "education",
              title: "Education",
              content: [
                {
                  institution: "State University",
                  degree: "B.S. Computer Science",
                  startDate: "Sep 2018",
                  endDate: "May 2022",
                },
              ],
            },
            {
              id: "sec-4",
              type: "skills",
              title: "Skills",
              content: [{ name: "TypeScript" }, { id: "   ", name: "PostgreSQL" }],
            },
            {
              id: "sec-5",
              type: "projects",
              title: "Projects",
              content: [{ name: "API Gateway", description: "Built gateway" }],
            },
            {
              id: "sec-6",
              type: "certifications",
              title: "Certifications",
              content: [{ name: "AWS Certified Developer", issuer: "AWS" }],
            },
          ],
          sectionOrder: [],
        },
      };

      const normalized = normalizeResume(rawAiResume as IResume);
      const types = normalized.content.sections.map((s) => s.type);
      expect(types).toEqual([
        SectionType.WORK,
        SectionType.WORK,
        SectionType.EDUCATION,
        SectionType.SKILLS,
        SectionType.PROJECTS,
        SectionType.CERTIFICATES,
      ]);

      // Every item receives a unique non-empty id
      const allIds = normalized.content.sections.flatMap((s) =>
        s.content.map((item) => item.id)
      );
      expect(allIds.every((id) => typeof id === "string" && id.trim().length > 0)).toBe(
        true
      );
      expect(new Set(allIds).size).toBe(allIds.length);

      // Every normalized section opens a valid editor form without Unsupported Section
      for (const sec of normalized.content.sections) {
        const { unmount } = render(
          <SectionEditors
            content={{ type: sec.type, item: sec.content[0] }}
            onClose={jest.fn()}
            onSave={jest.fn()}
          />
        );
        expect(screen.queryByText(/Unsupported Section/i)).not.toBeInTheDocument();
        unmount();
      }
    });
  });

  describe("Sibling safety & non-empty itemId guards", () => {
    it("isolates sibling items during inline editing, hiding, and deleting even when raw input lacked item IDs", () => {
      const rawResume: any = {
        _id: "res-sibling-1",
        title: "Sibling Isolation Resume",
        content: {
          basics: {
            name: "Alex Rivera",
            email: "alex@example.com",
            summary: "Distributed systems engineer building TypeScript services.",
          },
          sections: [
            {
              id: "sec-work",
              type: "experience",
              title: "Work Experience",
              content: [
                {
                  company: "Alpha Labs",
                  position: "Engineer I",
                  description: "Worked on TypeScript APIs",
                },
                {
                  company: "Omega Cloud",
                  position: "Senior Engineer",
                  description: "Built distributed queues",
                },
              ],
            },
          ],
          sectionOrder: ["sec-work"],
        },
      };

      const normalized = normalizeResume(rawResume as IResume);
      const [firstItem, secondItem] = normalized.content.sections[0].content as any[];
      expect(firstItem.id).not.toBe(secondItem.id);

      let latestResume = normalized;
      const Harness: React.FC = () => {
        const ctx = useTemplateContext();
        return (
          <div>
            <button
              type="button"
              onClick={() =>
                ctx.updateSectionItemPatch("sec-work", "   ", {
                  position: "SHOULD_NOT_APPLY",
                })
              }
            >
              Empty ID Patch
            </button>
            <button
              type="button"
              onClick={() =>
                ctx.updateSectionItemPatch("sec-work", firstItem.id, {
                  position: "Staff Engineer",
                })
              }
            >
              Valid First Patch
            </button>
          </div>
        );
      };

      render(
        <TemplateProvider
          resume={normalized}
          onChange={(updated) => {
            latestResume = updated;
          }}
        >
          <Harness />
        </TemplateProvider>
      );

      // Empty itemId guard prevents accidental mutation
      fireEvent.click(screen.getByText("Empty ID Patch"));
      expect((latestResume.content.sections[0].content[0] as any).position).toBe(
        "Engineer I"
      );
      expect((latestResume.content.sections[0].content[1] as any).position).toBe(
        "Senior Engineer"
      );

      // Valid itemId updates only the targeted item, leaving sibling untouched
      fireEvent.click(screen.getByText("Valid First Patch"));
      expect((latestResume.content.sections[0].content[0] as any).position).toBe(
        "Staff Engineer"
      );
      expect((latestResume.content.sections[0].content[1] as any).position).toBe(
        "Senior Engineer"
      );
    });

    it("deletes or hides only one normalized item in ResumeEditor while keeping sibling items intact", () => {
      const rawResume: any = {
        _id: "res-editor-1",
        id: "res-editor-1",
        title: "Editor Guard Resume",
        content: {
          basics: {
            name: "Taylor Chen",
            email: "taylor@example.com",
            summary: "Full stack engineer.",
          },
          sections: [
            {
              id: "sec-work",
              type: "work",
              title: "Professional Experience",
              content: [
                {
                  company: "First Co",
                  position: "Backend Developer",
                  description: "Worked on REST services",
                },
                {
                  company: "Second Co",
                  position: "Platform Engineer",
                  description: "Worked on observability",
                },
              ],
            },
          ],
          sectionOrder: ["sec-work"],
        },
      };

      render(<ResumeEditor initialResume={rawResume as IResume} />);

      expect(screen.getAllByText(/First Co/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Second Co/i).length).toBeGreaterThan(0);

      // Hide First Co -> Second Co remains visible
      const hideButtons = screen.getAllByTitle("Hide item from resume");
      fireEvent.click(hideButtons[0]);
      expect(screen.getByTitle("Show item on resume")).toBeInTheDocument();
      expect(screen.getAllByText(/Second Co/i).length).toBeGreaterThan(0);

      // Delete First Co -> Second Co still remains in the editor
      fireEvent.click(screen.getByRole("button", { name: "Remove First Co" }));
      expect(screen.queryByText("Backend Developer")).not.toBeInTheDocument();
      expect(screen.getAllByText(/Second Co/i).length).toBeGreaterThan(0);

      // Verify desktop 2-panel 55/45 split is preserved
      const panels = screen.queryAllByTestId("mock-panel");
      if (panels.length === 2) {
        expect(panels[0]).toHaveAttribute("data-default-size", "55");
        expect(panels[0]).toHaveAttribute("data-min-size", "38");
        expect(panels[1]).toHaveAttribute("data-default-size", "45");
        expect(panels[1]).toHaveAttribute("data-min-size", "30");
      }
    });
  });

  describe("Client-side < 16ms X-Y-Z metric detector & InlineBulletCoach", () => {
    it("runs X-Y-Z metric and conciseness analysis well under 16ms", () => {
      const sample =
        "Worked on TypeScript and PostgreSQL microservices handling authentication and billing workflows across distributed teams";
      const start = performance.now();
      const analysis = analyzeBulletText(sample);
      const elapsedMs = performance.now() - start;

      expect(elapsedMs).toBeLessThan(16);
      expect(analysis.hasMetrics).toBe(false);

      const quantified = analyzeBulletText("Reduced p99 API latency by 35% across 12 services.");
      expect(quantified.hasMetrics).toBe(true);
    });

    it("opens X-Y-Z prompt on focus when metrics are missing, inserts exact user metric without fabrication, and supports Rewrite/Shorten/Improve + Undo with source_fact_ids", async () => {
      const handleSave = jest.fn();
      render(
        <SectionEditors
          content={{
            type: SectionType.WORK,
            item: {
              id: "work-1",
              name: "Acme Cloud",
              position: "Backend Engineer",
              description: "Worked on TypeScript APIs",
            },
          }}
          onClose={jest.fn()}
          onSave={handleSave}
        />
      );

      const textarea = screen.getByLabelText(
        /Description & Key Achievements/i
      ) as HTMLTextAreaElement;

      // Controls are rendered beneath textarea
      expect(screen.getByTestId("section-description-coach-rewrite-btn")).toBeInTheDocument();
      expect(screen.getByTestId("section-description-coach-shorten-btn")).toBeInTheDocument();
      expect(screen.getByTestId("section-description-coach-improve-btn")).toBeInTheDocument();
      expect(screen.getByTestId("section-description-coach-undo-btn")).toBeInTheDocument();

      // Focusing a bullet without metrics opens the X-Y-Z prompt with all 3 impact chips
      fireEvent.focus(textarea);
      const xyzPanel = screen.getByTestId("section-description-coach-xyz-panel");
      expect(within(xyzPanel).getByRole("button", { name: "Reduced latency" })).toBeInTheDocument();
      expect(
        within(xyzPanel).getByRole("button", { name: "Increased throughput" })
      ).toBeInTheDocument();
      expect(within(xyzPanel).getByRole("button", { name: "Cut cost" })).toBeInTheDocument();

      // Enter a real metric and insert verbatim
      fireEvent.click(within(xyzPanel).getByRole("button", { name: "Reduced latency" }));
      const metricInput = screen.getByTestId("section-description-coach-xyz-input");
      fireEvent.change(metricInput, { target: { value: "38%" } });
      fireEvent.click(screen.getByTestId("section-description-coach-xyz-apply-btn"));

      expect(textarea.value).toBe("Worked on TypeScript APIs, reducing latency by 38%.");

      // Undo restores exact prior text
      fireEvent.click(screen.getByTestId("section-description-coach-undo-btn"));
      expect(textarea.value).toBe("Worked on TypeScript APIs");

      // Clicking Rewrite previews a fact-grounded rewrite with source_fact_ids
      fireEvent.click(screen.getByTestId("section-description-coach-rewrite-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("section-description-coach-preview")).toBeInTheDocument();
      });
      expect(textarea.value).toBe("Delivered resilient TypeScript APIs.");
      expect(screen.getByTestId("section-description-coach-source-facts")).toHaveTextContent(
        "fact:bullet:input"
      );
      expect(screen.getByTestId("section-description-coach-source-facts")).toHaveTextContent(
        "fact:skill:typescript"
      );

      // Clicking Undo restores the prior text
      fireEvent.click(screen.getByTestId("section-description-coach-undo-btn"));
      expect(textarea.value).toBe("Worked on TypeScript APIs");
    });

    it("renders InlineBulletCoach beneath EducationForm description and ResumeEditor summary textareas", () => {
      const { unmount } = render(
        <EducationForm
          initialContent={{
            id: "edu-1",
            degree: "B.S. Computer Science",
            field: "MIT",
            description: "Completed distributed systems research",
          }}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByTestId("edu-description-coach-rewrite-btn")).toBeInTheDocument();
      expect(screen.getByTestId("edu-description-coach-shorten-btn")).toBeInTheDocument();
      expect(screen.getByTestId("edu-description-coach-improve-btn")).toBeInTheDocument();
      expect(screen.getByTestId("edu-description-coach-undo-btn")).toBeInTheDocument();
      unmount();

      render(
        <ResumeEditor
          initialResume={{
            _id: "res-summary-1",
            title: "Summary Coach Resume",
            content: {
              basics: {
                name: "Samira Patel",
                email: "samira@example.com",
                summary: "Worked on distributed cloud platforms",
              },
              sections: [],
              sectionOrder: [],
            },
          }}
        />
      );

      expect(screen.getByTestId("basics-summary-coach-rewrite-btn")).toBeInTheDocument();
      expect(screen.getByTestId("basics-summary-coach-shorten-btn")).toBeInTheDocument();
      expect(screen.getByTestId("basics-summary-coach-improve-btn")).toBeInTheDocument();
      expect(screen.getByTestId("basics-summary-coach-undo-btn")).toBeInTheDocument();
    });
  });
});
