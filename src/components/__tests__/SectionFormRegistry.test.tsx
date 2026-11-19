import React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SectionEditors, {
  SECTION_FORM_REGISTRY,
  getSectionFormEntry,
} from "../sections";
import ResumeEditor from "../ResumeEditor";
import { IResume, SectionType } from "../../types/resume";

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

jest.mock("../../services/resume.service", () => ({
  resumeService: {
    updateResume: jest.fn(),
    createResume: jest.fn(),
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
  },
}));

describe("Modular Section Form Registry & Modal Editors", () => {
  it("registers a dedicated, distinct form component for all 16 SectionType values", () => {
    const allTypes = Object.values(SectionType);
    expect(allTypes).toHaveLength(16);

    const registeredComponents = new Set<React.ComponentType<any>>();

    allTypes.forEach((sectionType) => {
      const entry = getSectionFormEntry(sectionType);
      expect(entry).toBeDefined();
      expect(entry!.title.trim().length).toBeGreaterThan(0);
      expect(typeof entry!.component).toBe("function");
      registeredComponents.add(entry!.component);
    });

    // Every section type has its own dedicated component rather than a shared generic placeholder
    expect(registeredComponents.size).toBe(16);
    expect(Object.keys(SECTION_FORM_REGISTRY)).toHaveLength(16);
  });

  describe("Work dialog (SectionType.WORK)", () => {
    it("renders company, position, location, date ranges, and role description, validates required fields, and saves structured WorkItem", () => {
      const onSave = jest.fn();
      const onClose = jest.fn();

      render(
        <SectionEditors
          content={{
            type: SectionType.WORK,
            item: { id: "w-1", company: "" },
          }}
          onClose={onClose}
          onSave={onSave}
        />
      );

      expect(
        screen.getByRole("dialog", { name: "Professional Experience" })
      ).toBeInTheDocument();

      const companyInput = screen.getByLabelText(/company/i);
      const positionInput = screen.getByLabelText(/position \/ role/i);
      const locationInput = screen.getByLabelText(/location/i);
      const descriptionInput = screen.getByLabelText(/role description/i);

      expect(companyInput).toBeInTheDocument();
      expect(positionInput).toBeInTheDocument();
      expect(locationInput).toBeInTheDocument();
      expect(screen.getByLabelText("Start Date Month")).toBeInTheDocument();
      expect(screen.getByLabelText("Start Date Year")).toBeInTheDocument();
      expect(screen.getByLabelText("End Date Month")).toBeInTheDocument();
      expect(screen.getByLabelText("End Date Year")).toBeInTheDocument();
      expect(descriptionInput).toBeInTheDocument();

      // Submitting empty form triggers validation errors and prevents onSave
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText(/company name is required/i)).toBeInTheDocument();
      expect(
        screen.getByText(/position or job title is required/i)
      ).toBeInTheDocument();

      // Fill required fields + invalid date range (End Date before Start Date)
      fireEvent.change(companyInput, { target: { value: "Stripe" } });
      fireEvent.change(positionInput, {
        target: { value: "Staff Frontend Engineer" },
      });
      fireEvent.change(locationInput, { target: { value: "Seattle, WA" } });
      fireEvent.change(descriptionInput, {
        target: { value: "Architected checkout component library." },
      });

      fireEvent.click(screen.getByLabelText("Start Date Month"));
      fireEvent.click(screen.getByText("June"));
      fireEvent.click(screen.getByLabelText("Start Date Year"));
      fireEvent.click(screen.getByText("2023"));

      fireEvent.click(screen.getByLabelText("End Date Month"));
      fireEvent.click(screen.getByText("January"));
      fireEvent.click(screen.getByLabelText("End Date Year"));
      fireEvent.click(screen.getByText("2022"));

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      expect(onSave).not.toHaveBeenCalled();
      expect(
        screen.getByText(/end date cannot be earlier than start date/i)
      ).toBeInTheDocument();

      // Fix End Date to 2024 and submit
      fireEvent.click(screen.getByLabelText("End Date Year"));
      fireEvent.click(screen.getByText("2024"));

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(
        SectionType.WORK,
        expect.objectContaining({
          id: "w-1",
          name: "Stripe",
          company: "Stripe",
          position: "Staff Frontend Engineer",
          location: "Seattle, WA",
          startDate: "Jun 2023",
          endDate: "Jan 2024",
          current: false,
          description: "Architected checkout component library.",
        })
      );
    });
  });

  describe("Skills dialog (SectionType.SKILLS)", () => {
    it("renders skill name, proficiency level, and sub-skills tag input, validates required name, and saves numeric level", () => {
      const onSave = jest.fn();
      const onClose = jest.fn();

      render(
        <SectionEditors
          content={{
            type: SectionType.SKILLS,
            item: { id: "s-1", name: "", level: "Intermediate" },
          }}
          onClose={onClose}
          onSave={onSave}
        />
      );

      const skillInput = screen.getByLabelText(/skill name/i);
      const levelTrigger = screen.getByLabelText(/proficiency level/i);
      const subSkillsInput = screen.getByLabelText(/sub-skills \/ keywords/i);

      // Required validation
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText(/skill name is required/i)).toBeInTheDocument();

      // Legacy "Intermediate" string normalized to "3 - Intermediate"
      expect(levelTrigger).toHaveTextContent("3 - Intermediate");

      // Update skill name, select 5 - Expert, and add sub-skill tags
      fireEvent.change(skillInput, { target: { value: "Frontend Architecture" } });
      fireEvent.click(levelTrigger);
      fireEvent.click(screen.getByText("5 - Expert"));

      fireEvent.change(subSkillsInput, { target: { value: "React" } });
      fireEvent.keyDown(subSkillsInput, { key: "Enter" });
      expect(screen.getByText("React")).toBeInTheDocument();

      fireEvent.change(subSkillsInput, { target: { value: "TypeScript" } });
      fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
      expect(screen.getByText("TypeScript")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      expect(onSave).toHaveBeenCalledWith(
        SectionType.SKILLS,
        expect.objectContaining({
          id: "s-1",
          name: "Frontend Architecture",
          level: 5,
          subSkills: ["React", "TypeScript"],
        })
      );
    });
  });

  describe("Projects dialog (SectionType.PROJECTS)", () => {
    it("renders project title, summary, link, and technology tags, validates title and URL, and supports chip add/remove + draft merge", () => {
      const onSave = jest.fn();
      const onClose = jest.fn();

      render(
        <SectionEditors
          content={{
            type: SectionType.PROJECTS,
            item: { id: "p-1", name: "", technologies: ["Docker"] },
          }}
          onClose={onClose}
          onSave={onSave}
        />
      );

      const titleInput = screen.getByLabelText(/project title/i);
      const linkInput = screen.getByLabelText(/project link/i);
      const techInput = screen.getByLabelText(/technology tags/i);
      const summaryInput = screen.getByLabelText(/project summary/i);

      // Existing tag rendered with remove button
      expect(screen.getByText("Docker")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Remove Docker" }));
      expect(screen.queryByText("Docker")).not.toBeInTheDocument();

      // Required title + invalid URL validation
      fireEvent.change(linkInput, { target: { value: "not a valid url" } });
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText(/project title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/valid project link/i)).toBeInTheDocument();

      // Populate valid project details
      fireEvent.change(titleInput, {
        target: { value: "Realtime Resume Engine" },
      });
      fireEvent.change(linkInput, {
        target: { value: "https://github.com/acme/resume-engine" },
      });
      fireEvent.change(summaryInput, {
        target: { value: "Built low-latency collaborative resume builder." },
      });

      // Add chip via Enter and leave comma-separated draft to merge on submit
      fireEvent.change(techInput, { target: { value: "React" } });
      fireEvent.keyDown(techInput, { key: "Enter" });
      fireEvent.change(techInput, {
        target: { value: "TypeScript, Tailwind CSS" },
      });

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      expect(onSave).toHaveBeenCalledWith(
        SectionType.PROJECTS,
        expect.objectContaining({
          id: "p-1",
          name: "Realtime Resume Engine",
          url: "https://github.com/acme/resume-engine",
          description: "Built low-latency collaborative resume builder.",
          technologies: ["React", "TypeScript", "Tailwind CSS"],
        })
      );
    });
  });

  describe("All remaining section dialogs validation and saving", () => {
    const remainingCases: Array<{
      type: SectionType;
      requiredLabel: RegExp;
      requiredValue: string;
      extraFill?: () => void;
      expectedSaved: Record<string, any>;
    }> = [
      {
        type: SectionType.EDUCATION,
        requiredLabel: /degree \/ qualification/i,
        requiredValue: "M.S. Computer Science",
        extraFill: () => {
          fireEvent.change(screen.getByLabelText(/school \/ institution/i), {
            target: { value: "Stanford University" },
          });
        },
        expectedSaved: {
          degree: "M.S. Computer Science",
          field: "Stanford University",
        },
      },
      {
        type: SectionType.LANGUAGES,
        requiredLabel: /language name/i,
        requiredValue: "Spanish",
        extraFill: () => {
          fireEvent.change(screen.getByLabelText(/proficiency \(%\)/i), {
            target: { value: "90" },
          });
        },
        expectedSaved: {
          name: "Spanish",
          proficiency: 90,
        },
      },
      {
        type: SectionType.CERTIFICATES,
        requiredLabel: /certificate name/i,
        requiredValue: "AWS Solutions Architect",
        extraFill: () => {
          fireEvent.change(screen.getByLabelText(/issuing organization/i), {
            target: { value: "Amazon Web Services" },
          });
        },
        expectedSaved: {
          name: "AWS Solutions Architect",
          issuer: "Amazon Web Services",
        },
      },
      {
        type: SectionType.INTERESTS,
        requiredLabel: /interest name/i,
        requiredValue: "Open Source Mentoring",
        expectedSaved: {
          name: "Open Source Mentoring",
        },
      },
      {
        type: SectionType.COURSES,
        requiredLabel: /course name/i,
        requiredValue: "Distributed Systems",
        extraFill: () => {
          fireEvent.change(screen.getByLabelText(/institution \/ platform/i), {
            target: { value: "MIT OpenCourseWare" },
          });
        },
        expectedSaved: {
          name: "Distributed Systems",
          institution: "MIT OpenCourseWare",
        },
      },
      {
        type: SectionType.AWARDS,
        requiredLabel: /award title/i,
        requiredValue: "Distinguished Engineer Award",
        extraFill: () => {
          fireEvent.change(screen.getByLabelText(/awarded by/i), {
            target: { value: "Acme Corp" },
          });
        },
        expectedSaved: {
          name: "Distinguished Engineer Award",
          issuer: "Acme Corp",
        },
      },
      {
        type: SectionType.ORGANIZATIONS,
        requiredLabel: /organization name/i,
        requiredValue: "Women Who Code",
        extraFill: () => {
          fireEvent.change(screen.getByLabelText(/role \/ position/i), {
            target: { value: "Chapter Lead" },
          });
        },
        expectedSaved: {
          name: "Women Who Code",
          position: "Chapter Lead",
        },
      },
      {
        type: SectionType.PUBLICATIONS,
        requiredLabel: /publication title/i,
        requiredValue: "Resilient Micro-Frontends at Scale",
        extraFill: () => {
          fireEvent.change(screen.getByLabelText(/publisher \/ journal/i), {
            target: { value: "IEEE Software" },
          });
        },
        expectedSaved: {
          title: "Resilient Micro-Frontends at Scale",
          publisher: "IEEE Software",
        },
      },
      {
        type: SectionType.REFERENCES,
        requiredLabel: /reference name/i,
        requiredValue: "Alex Morgan",
        extraFill: () => {
          fireEvent.change(screen.getByLabelText(/company/i), {
            target: { value: "Globex" },
          });
          fireEvent.change(screen.getByLabelText(/contact info/i), {
            target: { value: "alex@globex.com" },
          });
        },
        expectedSaved: {
          name: "Alex Morgan",
          company: "Globex",
          contact: "alex@globex.com",
        },
      },
      {
        type: SectionType.SOFTSKILSS,
        requiredLabel: /soft skill name/i,
        requiredValue: "Executive Communication",
        expectedSaved: {
          name: "Executive Communication",
        },
      },
      {
        type: SectionType.ACHIVEMENTS,
        requiredLabel: /achievement title/i,
        requiredValue: "Cut bundle size by 42%",
        expectedSaved: {
          name: "Cut bundle size by 42%",
        },
      },
      {
        type: SectionType.TECK_SKILLS,
        requiredLabel: /category or skill name/i,
        requiredValue: "Cloud Infrastructure",
        extraFill: () => {
          const techInput = screen.getByLabelText(/technologies/i);
          fireEvent.change(techInput, {
            target: { value: "Kubernetes, Terraform" },
          });
        },
        expectedSaved: {
          name: "Cloud Infrastructure",
          technologies: ["Kubernetes", "Terraform"],
        },
      },
      {
        type: SectionType.CUSTOM,
        requiredLabel: /^title/i,
        requiredValue: "Keynote Speaker",
        extraFill: () => {
          fireEvent.change(screen.getByLabelText(/subtitle/i), {
            target: { value: "React Conf" },
          });
        },
        expectedSaved: {
          title: "Keynote Speaker",
          subtitle: "React Conf",
        },
      },
    ];

    it.each(remainingCases)(
      "validates required fields and saves structured data for $type",
      ({ type, requiredLabel, requiredValue, extraFill, expectedSaved }) => {
        const onSave = jest.fn();
        const onClose = jest.fn();

        render(
          <SectionEditors
            content={{ type, item: { id: `item-${type}` } }}
            onClose={onClose}
            onSave={onSave}
          />
        );

        // Blank submit is blocked with alert message
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);

        const primaryControl = screen.getByLabelText(requiredLabel);
        primaryControl.focus();
        expect(document.activeElement).toBe(primaryControl);

        fireEvent.change(primaryControl, { target: { value: requiredValue } });
        extraFill?.();

        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
        expect(onSave).toHaveBeenCalledWith(
          type,
          expect.objectContaining(expectedSaved)
        );
      }
    );
  });

  describe("Cancel and Escape modal dismissal", () => {
    it("dismisses via Cancel button or Escape key without invoking onSave, and closes open Select dropdown first on Escape", () => {
      const onSave = jest.fn();
      const onClose = jest.fn();

      const { rerender } = render(
        <SectionEditors
          content={{
            type: SectionType.WORK,
            item: { id: "w-1", name: "Initial Co", position: "Engineer" },
          }}
          onClose={onClose}
          onSave={onSave}
        />
      );

      fireEvent.change(screen.getByLabelText(/company/i), {
        target: { value: "Edited Unsaved Co" },
      });

      // Open Month dropdown -> first Escape closes dropdown only, NOT modal
      fireEvent.click(screen.getByLabelText("Start Date Month"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();

      // Second Escape dismisses the modal dialog without saving
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSave).not.toHaveBeenCalled();

      // Cancel button also invokes onClose without saving
      rerender(
        <SectionEditors
          content={{
            type: SectionType.SKILLS,
            item: { id: "s-1", name: "React" },
          }}
          onClose={onClose}
          onSave={onSave}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
      expect(onClose).toHaveBeenCalledTimes(2);
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe("ResumeEditor end-to-end modal integration", () => {
    const baseResume: IResume = {
      _id: "res-200",
      title: "Full Stack Resume",
      content: {
        basics: {
          name: "Samira Patel",
          label: "Principal Engineer",
          email: "samira@example.com",
        },
        sections: [
          {
            id: "sec-work",
            type: SectionType.WORK,
            title: "Professional Experience",
            content: [],
          },
          {
            id: "sec-projects",
            type: SectionType.PROJECTS,
            title: "Projects",
            content: [],
          },
        ],
        sectionOrder: ["sec-work", "sec-projects"],
      },
    };

    it("adds Work and Project entries via modal forms into resume state & preview, and leaves state unchanged on Cancel or Escape", async () => {
      render(<ResumeEditor initialResume={baseResume} onBack={jest.fn()} />);

      // 1. Add Work Experience entry
      fireEvent.click(
        screen.getByRole("button", {
          name: "Add item to Professional Experience",
        })
      );

      const workDialog = screen.getByRole("dialog", {
        name: "Professional Experience",
      });
      fireEvent.change(within(workDialog).getByLabelText(/company/i), {
        target: { value: "Linear" },
      });
      fireEvent.change(within(workDialog).getByLabelText(/position \/ role/i), {
        target: { value: "Staff Product Engineer" },
      });
      fireEvent.click(within(workDialog).getByLabelText("Start Date Month"));
      fireEvent.click(within(workDialog).getByText("March"));
      fireEvent.click(within(workDialog).getByLabelText("Start Date Year"));
      fireEvent.click(within(workDialog).getByText("2022"));
      fireEvent.click(
        within(workDialog).getByLabelText(/currently working here/i)
      );
      fireEvent.change(within(workDialog).getByLabelText(/role description/i), {
        target: { value: "Led realtime sync engine." },
      });

      fireEvent.click(
        within(workDialog).getByRole("button", { name: /^save$/i })
      );

      // Modal closes and entry appears in both editor card and live preview
      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "Professional Experience" })
        ).not.toBeInTheDocument();
      });
      expect(screen.getAllByText("Linear").length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText("Staff Product Engineer").length
      ).toBeGreaterThanOrEqual(1);

      // 2. Open Edit modal on Linear, modify text, press Escape -> state unchanged!
      fireEvent.click(screen.getByRole("button", { name: "Edit Linear" }));
      const editDialog = screen.getByRole("dialog", {
        name: "Professional Experience",
      });
      fireEvent.change(within(editDialog).getByLabelText(/company/i), {
        target: { value: "Discarded Company Edit" },
      });
      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "Professional Experience" })
        ).not.toBeInTheDocument();
      });
      expect(
        screen.queryByText("Discarded Company Edit")
      ).not.toBeInTheDocument();
      expect(screen.getAllByText("Linear").length).toBeGreaterThanOrEqual(1);

      // 3. Add Project entry with URL and technology tags
      fireEvent.click(
        screen.getByRole("button", { name: "Add item to Projects" })
      );
      const projDialog = screen.getByRole("dialog", { name: "Projects" });
      fireEvent.change(within(projDialog).getByLabelText(/project title/i), {
        target: { value: "GraphQL Mesh Gateway" },
      });
      fireEvent.change(within(projDialog).getByLabelText(/project link/i), {
        target: { value: "https://github.com/samira/mesh-gateway" },
      });
      const techInput = within(projDialog).getByLabelText(/technology tags/i);
      fireEvent.change(techInput, { target: { value: "GraphQL, Rust" } });
      fireEvent.keyDown(techInput, { key: "Enter" });
      fireEvent.change(within(projDialog).getByLabelText(/project summary/i), {
        target: { value: "Federated schema router with sub-millisecond overhead." },
      });

      fireEvent.click(
        within(projDialog).getByRole("button", { name: /^save$/i })
      );

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "Projects" })
        ).not.toBeInTheDocument();
      });
      expect(
        screen.getAllByText("GraphQL Mesh Gateway").length
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("GraphQL").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Rust").length).toBeGreaterThanOrEqual(1);
    });
  });
});
