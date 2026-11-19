import React, { useState } from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ResumePreview, {
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  LETTER_WIDTH_PX,
  LETTER_HEIGHT_PX,
  calculatePageCount,
} from "../components/ResumePreview";
import PublicResumeView from "../components/PublicResumeView";
import ResumeEditor from "../components/ResumeEditor";
import { templateRegistry } from "../components/templates/registry";
import {
  defaultThemeConfig,
  getPageDimensions,
  getNextFitThemeStep,
  FIT_MIN_FONT_SCALE,
  FIT_MIN_LINE_HEIGHT,
} from "../constants/themeConstants";
import {
  computeScaledDimensions,
  compressDrawableToDataUrl,
  getDataUrlByteSize,
  isAllowedPhotoFile,
  MAX_PHOTO_DIMENSION_PX,
  MAX_PHOTO_SIZE_BYTES,
} from "../utils/imageCompression";
import { IResume, SectionType } from "../types/resume";
import { resumeService } from "../services/resume.service";

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
    updateResume: jest.fn().mockResolvedValue({ _id: "res-test-1" }),
    createResume: jest.fn().mockResolvedValue({ _id: "res-test-1" }),
    getPublicResume: jest.fn(),
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
  },
}));

const SAMPLE_PHOTO_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";

function buildResume(overrides?: Partial<IResume>): IResume {
  return {
    _id: "res-test-1",
    title: "Maya Lin Resume",
    templateId: "modern",
    content: {
      basics: {
        name: "Maya Lin",
        label: "Staff Product Engineer",
        email: "maya.lin@example.com",
        phone: "+1 415-555-0142",
        url: "https://mayalin.dev",
        summary:
          "Product-minded engineer with 9+ years designing resilient frontend systems.",
        location: {
          city: "Seattle",
          region: "WA",
          countryCode: "US",
        },
        profiles: [
          {
            network: "LinkedIn",
            username: "mayalin",
            url: "https://linkedin.com/in/mayalin",
          },
        ],
      },
      sections: [
        {
          id: "sec-work",
          type: SectionType.WORK,
          title: "Experience",
          content: [
            {
              id: "w-1",
              company: "Northstar Cloud",
              position: "Staff Frontend Engineer",
              startDate: "2022-02",
              current: true,
              location: "Seattle, WA",
              description: "Architected shared design system and PDF print pipeline.",
              highlights: [
                "Reduced bundle size by 28% across 14 micro-frontends.",
                "Shipped accessible keyboard workflows audited to WCAG 2.1 AA.",
              ],
            },
          ],
        },
        {
          id: "sec-edu",
          type: SectionType.EDUCATION,
          title: "Education",
          content: [
            {
              id: "e-1",
              institution: "University of Washington",
              degree: "B.S.",
              field: "Computer Science",
              startDate: "2013-09",
              endDate: "2017-06",
            },
          ],
        },
        {
          id: "sec-skills",
          type: SectionType.SKILLS,
          title: "Skills",
          content: [
            { id: "s-1", name: "TypeScript", level: 5 },
            { id: "s-2", name: "React", level: 5 },
            { id: "s-3", name: "Accessibility", level: 4 },
          ],
        },
        {
          id: "sec-langs",
          type: SectionType.LANGUAGES,
          title: "Languages",
          content: [
            { id: "l-1", name: "English", fluency: "Native" },
            { id: "l-2", name: "Mandarin", fluency: "Fluent" },
          ],
        },
      ],
      sectionOrder: ["sec-work", "sec-edu", "sec-skills", "sec-langs"],
    },
    ...overrides,
  };
}

const StatefulPreviewHarness: React.FC<{ initial: IResume }> = ({ initial }) => {
  const [resume, setResume] = useState<IResume>(initial);
  return <ResumePreview resume={resume} onChange={setResume} />;
};

describe("1. Page Size ('A4' | 'Letter')", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("defaults ThemeConfig.pageSize to 'A4' with 794x1123 dimensions and @page { size: A4 }", () => {
    expect(defaultThemeConfig.pageSize).toBe("A4");
    expect(getPageDimensions()).toEqual(
      expect.objectContaining({
        id: "A4",
        widthPx: A4_WIDTH_PX,
        heightPx: A4_HEIGHT_PX,
        cssSize: "A4",
      })
    );
    expect(getPageDimensions("Letter")).toEqual(
      expect.objectContaining({
        id: "Letter",
        widthPx: LETTER_WIDTH_PX,
        heightPx: LETTER_HEIGHT_PX,
        cssSize: "Letter",
      })
    );

    render(<StatefulPreviewHarness initial={buildResume()} />);

    const pageEl = screen.getByTestId("resume-preview-page");
    expect(pageEl).toHaveAttribute("data-page-size", "A4");
    expect(pageEl).toHaveStyle({
      width: `${A4_WIDTH_PX}px`,
      minHeight: `${A4_HEIGHT_PX}px`,
    });

    const printStyle = screen.getByTestId("resume-print-page-style");
    expect(printStyle.textContent).toContain("@page { size: A4; }");
  });

  it("updates preview page dimensions and @page print rule when switching to 'Letter'", () => {
    render(<StatefulPreviewHarness initial={buildResume()} />);

    fireEvent.click(screen.getByTestId("theme-customization-btn"));

    const a4Btn = screen.getByTestId("page-size-option-A4");
    const letterBtn = screen.getByTestId("page-size-option-Letter");
    expect(a4Btn).toHaveAttribute("aria-pressed", "true");
    expect(letterBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(letterBtn);

    expect(letterBtn).toHaveAttribute("aria-pressed", "true");
    const pageEl = screen.getByTestId("resume-preview-page");
    expect(pageEl).toHaveAttribute("data-page-size", "Letter");
    expect(pageEl).toHaveStyle({
      width: `${LETTER_WIDTH_PX}px`,
      minHeight: `${LETTER_HEIGHT_PX}px`,
    });

    const printStyle = screen.getByTestId("resume-print-page-style");
    expect(printStyle.textContent).toContain("@page { size: Letter; }");
  });

  it("applies Letter dimensions and @page { size: Letter } in PublicResumeView", async () => {
    (resumeService.getPublicResume as jest.Mock).mockResolvedValueOnce(
      buildResume({
        themeConfig: {
          ...defaultThemeConfig,
          pageSize: "Letter",
        },
      })
    );

    render(<PublicResumeView shareToken="tok-letter" />);

    const pageEl = await screen.findByTestId("resume-preview-page");
    expect(pageEl).toHaveAttribute("data-page-size", "Letter");
    expect(pageEl).toHaveStyle({
      width: `${LETTER_WIDTH_PX}px`,
      minHeight: `${LETTER_HEIGHT_PX}px`,
    });
    expect(screen.getByTestId("resume-print-page-style").textContent).toContain(
      "@page { size: Letter; }"
    );
  });
});

describe("2. Profile Photo (Upload, Resize/Compress, Remove, ThemeConfig.photo, All Templates)", () => {
  it("validates allowed MIME types (png/jpg/webp) and scales dimensions to max 400px", () => {
    expect(
      isAllowedPhotoFile(new File(["x"], "avatar.png", { type: "image/png" }))
    ).toBe(true);
    expect(
      isAllowedPhotoFile(new File(["x"], "avatar.jpg", { type: "image/jpeg" }))
    ).toBe(true);
    expect(
      isAllowedPhotoFile(new File(["x"], "avatar.webp", { type: "image/webp" }))
    ).toBe(true);
    expect(
      isAllowedPhotoFile(new File(["x"], "avatar.gif", { type: "image/gif" }))
    ).toBe(false);
    expect(
      isAllowedPhotoFile(
        new File(["x"], "doc.pdf", { type: "application/pdf" })
      )
    ).toBe(false);

    expect(computeScaledDimensions(1600, 1200, MAX_PHOTO_DIMENSION_PX)).toEqual({
      width: 400,
      height: 300,
    });
    expect(computeScaledDimensions(900, 1800, MAX_PHOTO_DIMENSION_PX)).toEqual({
      width: 200,
      height: 400,
    });
    expect(computeScaledDimensions(250, 200, MAX_PHOTO_DIMENSION_PX)).toEqual({
      width: 250,
      height: 200,
    });
  });

  it("iteratively compresses oversized images on canvas down to <= 400px and <= 150KB", () => {
    const drawnDimensions: Array<{ w: number; h: number }> = [];
    const qualityAttempts: Array<number | undefined> = [];

    const createMockCanvas = () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: "#fff",
          fillRect: jest.fn(),
          clearRect: jest.fn(),
          drawImage: (_src: any, _x: number, _y: number, w: number, h: number) => {
            drawnDimensions.push({ w, h });
          },
        }),
        toDataURL: (format: string, quality?: number) => {
          qualityAttempts.push(quality);
          // Simulate oversized payload at high quality (>150KB) and compact payload once quality <= 0.68
          const simulatedByteTarget =
            quality === undefined || quality > 0.7 ? 210 * 1024 : 95 * 1024;
          const base64Chars = Math.ceil((simulatedByteTarget * 4) / 3);
          const padLen = (4 - (base64Chars % 4)) % 4;
          const payload = "A".repeat(base64Chars) + "=".repeat(padLen);
          return `data:${format};base64,${payload}`;
        },
      };
      return canvas as unknown as HTMLCanvasElement;
    };

    const result = compressDrawableToDataUrl(
      { width: 2400, height: 1800, naturalWidth: 2400, naturalHeight: 1800 },
      "image/jpeg",
      MAX_PHOTO_DIMENSION_PX,
      MAX_PHOTO_SIZE_BYTES,
      createMockCanvas
    );

    expect(drawnDimensions[0]).toEqual({ w: 400, h: 300 });
    expect(qualityAttempts.length).toBeGreaterThan(1);
    expect(result.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(getDataUrlByteSize(result)).toBeLessThanOrEqual(MAX_PHOTO_SIZE_BYTES);
  });

  it("uploads a photo in ResumeEditor Basic Information, renders it in preview, and removes it", async () => {
    render(<ResumeEditor initialResume={buildResume()} onBack={jest.fn()} />);

    expect(screen.queryByTestId("remove-photo-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resume-profile-photo")).not.toBeInTheDocument();

    const fileInput = screen.getByTestId("profile-photo-input") as HTMLInputElement;
    expect(fileInput).toHaveAttribute(
      "accept",
      "image/png,image/jpeg,image/webp"
    );

    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const validFile = new File([pngBytes], "headshot.png", {
      type: "image/png",
    });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const editorThumb = await screen.findByTestId("editor-profile-photo-preview");
    expect(editorThumb.getAttribute("src")).toMatch(/^data:image\/png;base64,/);

    const previewPhoto = await screen.findByTestId("resume-profile-photo");
    expect(previewPhoto.getAttribute("src")).toMatch(/^data:image\/png;base64,/);

    const removeBtn = screen.getByTestId("remove-photo-btn");
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(
        screen.queryByTestId("editor-profile-photo-preview")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("resume-profile-photo")
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("remove-photo-btn")).not.toBeInTheDocument();
    });
  });

  it("shows an accessible alert error when uploading an invalid file format", async () => {
    render(<ResumeEditor initialResume={buildResume()} onBack={jest.fn()} />);

    const fileInput = screen.getByTestId("profile-photo-input");
    const badFile = new File(["gif89a"], "animated.gif", { type: "image/gif" });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    const errorAlert = await screen.findByTestId("profile-photo-error");
    expect(errorAlert).toHaveAttribute("role", "alert");
    expect(errorAlert).toHaveTextContent(/PNG, JPG, or WebP/i);
    expect(screen.queryByTestId("resume-profile-photo")).not.toBeInTheDocument();
  });

  it("updates ThemeConfig.photo { show, shape, size } from Customize Theme", () => {
    const resumeWithPhoto = buildResume({
      content: {
        ...buildResume().content,
        basics: {
          ...buildResume().content.basics,
          image: SAMPLE_PHOTO_DATA_URL,
        },
      },
    });

    render(<StatefulPreviewHarness initial={resumeWithPhoto} />);

    let photo = screen.getByTestId("resume-profile-photo");
    expect(photo).toHaveAttribute("data-photo-shape", "circle");
    expect(photo).toHaveAttribute("data-photo-size", "md");
    expect(photo.className).toContain("rounded-full");
    expect(photo.className).toContain("w-20");

    fireEvent.click(screen.getByTestId("theme-customization-btn"));

    fireEvent.click(screen.getByTestId("photo-shape-rounded"));
    photo = screen.getByTestId("resume-profile-photo");
    expect(photo).toHaveAttribute("data-photo-shape", "rounded");
    expect(photo.className).toContain("rounded-xl");

    fireEvent.click(screen.getByTestId("photo-shape-square"));
    photo = screen.getByTestId("resume-profile-photo");
    expect(photo).toHaveAttribute("data-photo-shape", "square");
    expect(photo.className).toContain("rounded-none");

    fireEvent.click(screen.getByTestId("photo-size-lg"));
    photo = screen.getByTestId("resume-profile-photo");
    expect(photo).toHaveAttribute("data-photo-size", "lg");
    expect(photo.className).toContain("w-28");

    fireEvent.click(screen.getByTestId("photo-size-sm"));
    photo = screen.getByTestId("resume-profile-photo");
    expect(photo).toHaveAttribute("data-photo-size", "sm");
    expect(photo.className).toContain("w-14");

    fireEvent.click(screen.getByTestId("photo-show-toggle"));
    expect(screen.queryByTestId("resume-profile-photo")).not.toBeInTheDocument();
  });

  it.each(templateRegistry.map((t) => [t.id, t] as const))(
    "renders profile photo in header of template '%s' and hides it in ATS mode",
    (_id, templateDef) => {
      const TemplateComp = templateDef.component;
      const base = buildResume({
        templateId: templateDef.id,
        content: {
          ...buildResume().content,
          basics: {
            ...buildResume().content.basics,
            image: SAMPLE_PHOTO_DATA_URL,
          },
        },
      });

      const { unmount } = render(<TemplateComp resume={base} readOnly />);
      const photoEl = screen.getByTestId("resume-profile-photo");
      expect(photoEl).toBeInTheDocument();
      expect(photoEl.closest("header, aside")).not.toBeNull();
      unmount();

      render(
        <TemplateComp
          resume={{
            ...base,
            themeConfig: { ...defaultThemeConfig, atsMode: true },
          }}
          readOnly
        />
      );
      expect(
        screen.queryByTestId("resume-profile-photo")
      ).not.toBeInTheDocument();
    }
  );
});

describe("3. Fit to One Page & Pagination Indicators", () => {
  it("calculates page count accurately across single and multi-page thresholds", () => {
    expect(calculatePageCount(800, A4_HEIGHT_PX)).toBe(1);
    expect(calculatePageCount(A4_HEIGHT_PX, A4_HEIGHT_PX)).toBe(1);
    expect(calculatePageCount(1500, A4_HEIGHT_PX)).toBe(2);
    expect(calculatePageCount(2246, A4_HEIGHT_PX)).toBe(2);
    expect(calculatePageCount(2500, A4_HEIGHT_PX)).toBe(3);
  });

  it("displays '2 pages' indicator and dashed page-break markers when content overflows one page", async () => {
    const scrollHeightSpy = jest
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute("data-testid") === "resume-preview-page") {
          return 1620;
        }
        return 0;
      });

    try {
      render(<StatefulPreviewHarness initial={buildResume()} />);

      await waitFor(() => {
        expect(screen.getByTestId("page-count-indicator")).toHaveTextContent(
          "2 pages"
        );
      });
      expect(screen.getByText("2 pages")).toBeInTheDocument();

      const markers = screen.getAllByTestId("page-break-marker");
      expect(markers).toHaveLength(1);
      expect(markers[0]).toHaveStyle({ top: `${A4_HEIGHT_PX}px` });
    } finally {
      scrollHeightSpy.mockRestore();
    }
  });

  it("iteratively reduces spacing, lineHeight, and fontScale until content fits on 1 page and stops early", async () => {
    // Dynamic height formula reflecting CSS custom properties on resume-preview-page:
    // Starts at ~1360px (> 1123px A4 height), drops below 1123px after a few reductions
    // well before hitting minimum fontScale (0.8) & lineHeight (1.2).
    const scrollHeightSpy = jest
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute("data-testid") === "resume-preview-page") {
          const scale = parseFloat(
            this.style.getPropertyValue("--theme-font-scale") || "1"
          );
          const lh = parseFloat(
            this.style.getPropertyValue("--theme-line-height") || "1.5"
          );
          const spacing =
            this.style.getPropertyValue("--theme-section-spacing") || "1.5rem";
          const spacingFactor =
            spacing === "1rem" ? 0.88 : spacing === "2.25rem" ? 1.15 : 1.0;
          return Math.round(1360 * scale * (lh / 1.5) * spacingFactor);
        }
        return 0;
      });

    try {
      let latestResume = buildResume({
        themeConfig: {
          ...defaultThemeConfig,
          sectionSpacing: "spacious",
          fontScale: 1,
          lineHeight: 1.5,
        },
      });

      const Wrapper: React.FC = () => {
        const [r, setR] = useState(latestResume);
        return (
          <ResumePreview
            resume={r}
            onChange={(next) => {
              latestResume = next;
              setR(next);
            }}
          />
        );
      };

      render(<Wrapper />);

      await waitFor(() => {
        expect(screen.getByTestId("page-count-indicator")).toHaveTextContent(
          "2 pages"
        );
      });

      fireEvent.click(screen.getByTestId("theme-customization-btn"));
      fireEvent.click(screen.getByTestId("fit-to-one-page-btn"));

      const statusBanner = await screen.findByTestId("fit-to-one-page-status");
      expect(statusBanner).toHaveAttribute("data-fit-status", "fitted");
      expect(screen.getByTestId("page-count-indicator")).toHaveTextContent(
        "1 page"
      );
      expect(screen.queryAllByTestId("page-break-marker")).toHaveLength(0);

      // Verify it stopped once fitted rather than slamming all settings to absolute minimums
      expect(
        (latestResume.themeConfig?.fontScale ?? 1) > FIT_MIN_FONT_SCALE ||
          (latestResume.themeConfig?.lineHeight ?? 1.5) > FIT_MIN_LINE_HEIGHT
      ).toBe(true);
    } finally {
      scrollHeightSpy.mockRestore();
    }
  });

  it("reports clearly when content cannot fit on one page within sensible minimums", async () => {
    const scrollHeightSpy = jest
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute("data-testid") === "resume-preview-page") {
          return 2600; // Remains >1 page even at minimum fontScale/lineHeight/compact spacing
        }
        return 0;
      });

    try {
      let latestResume = buildResume();
      const Wrapper: React.FC = () => {
        const [r, setR] = useState(latestResume);
        return (
          <ResumePreview
            resume={r}
            onChange={(next) => {
              latestResume = next;
              setR(next);
            }}
          />
        );
      };

      render(<Wrapper />);

      fireEvent.click(screen.getByTestId("theme-customization-btn"));
      fireEvent.click(screen.getByTestId("fit-to-one-page-btn"));

      const statusBanner = await screen.findByTestId("fit-to-one-page-status");
      expect(statusBanner).toHaveAttribute("data-fit-status", "cannot-fit");
      expect(statusBanner).toHaveTextContent(/Could not fit all content/i);

      // Stopped cleanly at sensible minimums
      expect(latestResume.themeConfig?.sectionSpacing).toBe("compact");
      expect(latestResume.themeConfig?.fontScale).toBe(FIT_MIN_FONT_SCALE);
      expect(latestResume.themeConfig?.lineHeight).toBe(FIT_MIN_LINE_HEIGHT);
      expect(getNextFitThemeStep(latestResume.themeConfig!, 20)).toBeNull();
    } finally {
      scrollHeightSpy.mockRestore();
    }
  });
});

describe("4. ATS Mode Toggle", () => {
  it("disables photo, icons, colours, and multi-column layouts in Customize Theme and restores on toggle off", () => {
    const richResume = buildResume({
      templateId: "creative-sidebar",
      content: {
        ...buildResume().content,
        basics: {
          ...buildResume().content.basics,
          image: SAMPLE_PHOTO_DATA_URL,
        },
      },
      themeConfig: {
        ...defaultThemeConfig,
        primaryColor: "#7c3aed",
        accentColor: "#059669",
        headingStyle: "pill",
        skillStyle: "bars",
      },
    });

    render(<StatefulPreviewHarness initial={richResume} />);

    const pageEl = screen.getByTestId("resume-preview-page");

    // Before ATS mode: photo, SVG contact icons, custom colour vars, and sidebar <aside> are present
    expect(screen.getByTestId("resume-profile-photo")).toBeInTheDocument();
    expect(pageEl.querySelectorAll("svg").length).toBeGreaterThan(0);
    expect(pageEl.querySelector("aside")).not.toBeNull();
    expect(pageEl.style.getPropertyValue("--theme-primary")).toBe("#7c3aed");

    // Open Customize Theme & enable ATS mode
    fireEvent.click(screen.getByTestId("theme-customization-btn"));
    const atsToggle = screen.getByTestId("ats-mode-toggle");
    expect(atsToggle).toHaveAttribute("aria-checked", "false");

    fireEvent.click(atsToggle);

    expect(atsToggle).toHaveAttribute("aria-checked", "true");
    expect(pageEl).toHaveAttribute("data-ats-mode", "true");

    // 1. Photo disabled
    expect(
      screen.queryByTestId("resume-profile-photo")
    ).not.toBeInTheDocument();

    // 2. Icons disabled inside resume page
    expect(pageEl.querySelectorAll("svg")).toHaveLength(0);

    // 3. Colours neutralized to monochrome
    expect(pageEl.style.getPropertyValue("--theme-primary")).toBe("#000000");
    expect(pageEl.style.getPropertyValue("--theme-accent")).toBe("#000000");
    expect(pageEl.style.getPropertyValue("--theme-heading-color")).toBe(
      "#000000"
    );

    // 4. Multi-column sidebar disabled while preserving all resume content
    expect(pageEl.querySelector("aside")).toBeNull();
    expect(within(pageEl).getByText("Maya Lin")).toBeInTheDocument();
    expect(within(pageEl).getByText("Northstar Cloud")).toBeInTheDocument();
    expect(within(pageEl).getByText(/TypeScript/)).toBeInTheDocument();

    // Toggling ATS mode back off restores photo, icons, colours, and sidebar
    fireEvent.click(atsToggle);
    expect(atsToggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("resume-profile-photo")).toBeInTheDocument();
    expect(pageEl.querySelectorAll("svg").length).toBeGreaterThan(0);
    expect(pageEl.querySelector("aside")).not.toBeNull();
    expect(pageEl.style.getPropertyValue("--theme-primary")).toBe("#7c3aed");
  });

  it.each(["tech-split", "executive-two-column", "timeline", "bold-header"])(
    "collapses multi-column/decorative structure in '%s' when ATS mode is enabled",
    (templateId) => {
      const resume = buildResume({
        templateId,
        content: {
          ...buildResume().content,
          basics: {
            ...buildResume().content.basics,
            image: SAMPLE_PHOTO_DATA_URL,
          },
        },
        themeConfig: {
          ...defaultThemeConfig,
          primaryColor: "#2563eb",
          atsMode: true,
        },
      });

      render(<ResumePreview resume={resume} readOnly />);
      const pageEl = screen.getByTestId("resume-preview-page");

      expect(pageEl).toHaveAttribute("data-ats-mode", "true");
      expect(
        screen.queryByTestId("resume-profile-photo")
      ).not.toBeInTheDocument();
      expect(pageEl.querySelectorAll("svg")).toHaveLength(0);
      expect(pageEl.querySelector("aside")).toBeNull();
      expect(
        within(pageEl).queryByTestId("timeline-date-rail")
      ).not.toBeInTheDocument();
      expect(
        within(pageEl).queryByTestId("bold-header-banner")
      ).not.toBeInTheDocument();
      expect(within(pageEl).getByText("Maya Lin")).toBeInTheDocument();
      expect(within(pageEl).getByText("Northstar Cloud")).toBeInTheDocument();
    }
  );
});
