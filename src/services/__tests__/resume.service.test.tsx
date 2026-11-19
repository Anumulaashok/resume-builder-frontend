import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import axiosInstance from "../axios";
import {
  resumeService,
  normalizeResumeIdentifiers,
} from "../resume.service";
import ResumeEditor from "../../components/ResumeEditor";
import ResumeList from "../../components/ResumeList";

jest.mock("../axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  AUTH_LOGOUT_EVENT: "auth:logout",
}));

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

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

describe("resumeService envelope unwrapping and identifier normalization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes identifiers so both id and _id are accessible", () => {
    const fromMongoId = normalizeResumeIdentifiers({
      _id: "6829d637b58e93c03f11f219",
      title: "Mongo Resume",
      content: { basics: {}, sections: [], sectionOrder: [] },
    });
    expect(fromMongoId._id).toBe("6829d637b58e93c03f11f219");
    expect(fromMongoId.id).toBe("6829d637b58e93c03f11f219");

    const fromClientId = normalizeResumeIdentifiers({
      id: "client-id-42",
      title: "Client Resume",
      content: { basics: {}, sections: [], sectionOrder: [] },
    });
    expect(fromClientId.id).toBe("client-id-42");
    expect(fromClientId._id).toBe("client-id-42");
  });

  it("unwraps { success, data } and normalizes id/_id in createResume", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          _id: "6829d637b58e93c03f11f219",
          userId: "user-1",
          title: "Backend Engineer Resume",
          createdAt: "2026-11-19T10:00:00.000Z",
          updatedAt: "2026-11-19T10:00:00.000Z",
          content: {
            basics: { name: "Ada Lovelace", email: "ada@example.com" },
            sections: [],
            sectionOrder: [],
          },
        },
      },
    } as any);

    const created = await resumeService.createResume({
      title: "Backend Engineer Resume",
      content: {
        basics: { name: "Ada Lovelace", email: "ada@example.com" },
        sections: [],
        sectionOrder: [],
      },
    });

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/resumes", {
      title: "Backend Engineer Resume",
      content: {
        basics: { name: "Ada Lovelace", email: "ada@example.com" },
        sections: [],
        sectionOrder: [],
      },
    });
    expect(created).not.toHaveProperty("success");
    expect(created).not.toHaveProperty("data");
    expect(created._id).toBe("6829d637b58e93c03f11f219");
    expect(created.id).toBe("6829d637b58e93c03f11f219");
    expect(created.title).toBe("Backend Engineer Resume");
  });

  it("unwraps { success, data } and normalizes id/_id in updateResume", async () => {
    mockedAxios.put.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          _id: "6829d637b58e93c03f11f219",
          userId: "user-1",
          title: "Updated Staff Resume",
          createdAt: "2026-11-19T10:00:00.000Z",
          updatedAt: "2026-11-19T10:05:00.000Z",
          content: {
            basics: { name: "Ada Lovelace", email: "ada@example.com" },
            sections: [],
            sectionOrder: [],
          },
        },
      },
    } as any);

    const updated = await resumeService.updateResume(
      "6829d637b58e93c03f11f219",
      { title: "Updated Staff Resume" }
    );

    expect(mockedAxios.put).toHaveBeenCalledWith(
      "/api/resumes/6829d637b58e93c03f11f219",
      { title: "Updated Staff Resume" }
    );
    expect(updated).not.toHaveProperty("success");
    expect(updated).not.toHaveProperty("data");
    expect(updated._id).toBe("6829d637b58e93c03f11f219");
    expect(updated.id).toBe("6829d637b58e93c03f11f219");
    expect(updated.title).toBe("Updated Staff Resume");
  });

  it("normalizes both id and _id across all records returned by getResumes", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            _id: "mongo-only-1",
            userId: "user-1",
            title: "First Resume",
            createdAt: "2026-11-19T10:00:00.000Z",
            updatedAt: "2026-11-19T10:00:00.000Z",
            content: { basics: {}, sections: [], sectionOrder: [] },
          },
        ],
      },
    } as any);

    const list = await resumeService.getResumes();
    expect(list).toHaveLength(1);
    expect(list[0]._id).toBe("mongo-only-1");
    expect(list[0].id).toBe("mongo-only-1");
  });
});

describe("End-to-end service + component integration with backend { success, data } envelopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("stores server-generated identifier on initial Save and uses updateResume (PUT) on subsequent auto-saves", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          _id: "6829d637b58e93c03f11f219",
          userId: "user-1",
          title: "Untitled Resume",
          createdAt: "2026-11-19T10:00:00.000Z",
          updatedAt: "2026-11-19T10:00:00.000Z",
          content: {
            basics: { name: "Grace Hopper", email: "grace@navy.mil" },
            sections: [],
            sectionOrder: [],
          },
        },
      },
    } as any);

    mockedAxios.put.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          _id: "6829d637b58e93c03f11f219",
          userId: "user-1",
          title: "Untitled Resume",
          createdAt: "2026-11-19T10:00:00.000Z",
          updatedAt: "2026-11-19T10:02:00.000Z",
          content: {
            basics: {
              name: "Admiral Grace Hopper",
              email: "grace@navy.mil",
            },
            sections: [],
            sectionOrder: [],
          },
        },
      },
    } as any);

    const onSave = jest.fn();
    render(<ResumeEditor onBack={jest.fn()} onSave={onSave} />);

    const nameInput = screen.getByLabelText("Full Name");
    fireEvent.change(nameInput, { target: { value: "Grace Hopper" } });

    // Initial manual Save -> POST /api/resumes
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "6829d637b58e93c03f11f219",
        id: "6829d637b58e93c03f11f219",
      })
    );
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("success");

    // Subsequent edit triggers background auto-save via PUT /api/resumes/:id (not POST)
    fireEvent.change(nameInput, { target: { value: "Admiral Grace Hopper" } });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.put).toHaveBeenCalledTimes(1);
    expect(mockedAxios.put).toHaveBeenCalledWith(
      "/api/resumes/6829d637b58e93c03f11f219",
      expect.objectContaining({
        _id: "6829d637b58e93c03f11f219",
        content: expect.objectContaining({
          basics: expect.objectContaining({ name: "Admiral Grace Hopper" }),
        }),
      })
    );
  });

  it("clicking Share on an unsaved resume creates the resume, stores the identifier, opens ShareModal, and auto-saves subsequent edits", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          _id: "share-created-555",
          userId: "user-1",
          title: "Untitled Resume",
          createdAt: "2026-11-19T10:00:00.000Z",
          updatedAt: "2026-11-19T10:00:00.000Z",
          content: {
            basics: { name: "Margaret Hamilton", email: "margaret@mit.edu" },
            sections: [],
            sectionOrder: [],
          },
        },
      },
    } as any);

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          isPublic: false,
          shareToken: null,
          privacy: {
            hideEmail: false,
            hidePhone: false,
            hideAddress: false,
          },
        },
      },
    } as any);

    mockedAxios.put.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          _id: "share-created-555",
          userId: "user-1",
          title: "Untitled Resume",
          createdAt: "2026-11-19T10:00:00.000Z",
          updatedAt: "2026-11-19T10:03:00.000Z",
          content: {
            basics: {
              name: "Margaret H. Hamilton",
              email: "margaret@mit.edu",
            },
            sections: [],
            sectionOrder: [],
          },
        },
      },
    } as any);

    render(<ResumeEditor onBack={jest.fn()} />);

    const nameInput = screen.getByLabelText("Full Name");
    fireEvent.change(nameInput, { target: { value: "Margaret Hamilton" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("share-resume-btn-1"));
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("dialog", { name: /Share "Untitled Resume"/i })
    ).toBeInTheDocument();
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/api/resumes/share-created-555/share"
    );

    // Close modal and edit content -> should auto-save via PUT using stored ID
    fireEvent.click(screen.getByRole("button", { name: /^done$/i }));
    fireEvent.change(nameInput, { target: { value: "Margaret H. Hamilton" } });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.put).toHaveBeenCalledTimes(1);
    expect(mockedAxios.put).toHaveBeenCalledWith(
      "/api/resumes/share-created-555",
      expect.objectContaining({
        _id: "share-created-555",
      })
    );
  });

  it("clones an existing resume in ResumeList and renders the unwrapped cloned card with title and working actions immediately", async () => {
    jest.useRealTimers();

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            _id: "orig-resume-1",
            userId: "user-1",
            title: "Senior Frontend CV",
            templateId: "professional",
            createdAt: "2026-11-18T10:00:00.000Z",
            updatedAt: "2026-11-18T12:00:00.000Z",
            content: {
              basics: {
                name: "Anumula Ashok",
                label: "Staff Frontend Engineer",
                email: "ashok@example.com",
              },
              sections: [],
              sectionOrder: [],
            },
          },
        ],
      },
    } as any);

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          _id: "cloned-resume-2",
          userId: "user-1",
          title: "Senior Frontend CV (Copy)",
          templateId: "professional",
          createdAt: "2026-11-19T10:00:00.000Z",
          updatedAt: "2026-11-19T10:00:00.000Z",
          content: {
            basics: {
              name: "Anumula Ashok",
              label: "Staff Frontend Engineer",
              email: "ashok@example.com",
            },
            sections: [],
            sectionOrder: [],
          },
        },
      },
    } as any);

    mockedAxios.delete.mockResolvedValueOnce({
      data: { success: true, data: null },
    } as any);

    const onEditResume = jest.fn();
    const onResumesLoad = jest.fn();
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(
      <ResumeList onEditResume={onEditResume} onResumesLoad={onResumesLoad} />
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("resume-card")).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /^clone$/i }));

    await waitFor(() => {
      expect(screen.getAllByTestId("resume-card")).toHaveLength(2);
    });

    // Ensure original _id and id were not sent in createResume payload
    const createPayload = mockedAxios.post.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(createPayload).not.toHaveProperty("_id");
    expect(createPayload).not.toHaveProperty("id");
    expect(createPayload.title).toBe("Senior Frontend CV (Copy)");

    const cards = screen.getAllByTestId("resume-card");
    const clonedCard = cards[1];
    expect(
      within(clonedCard).getByRole("heading", {
        name: "Senior Frontend CV (Copy)",
      })
    ).toBeInTheDocument();
    expect(
      within(clonedCard).getByRole("button", { name: /^edit$/i })
    ).toBeInTheDocument();
    expect(
      within(clonedCard).getByRole("button", { name: /^share$/i })
    ).toBeInTheDocument();
    expect(
      within(clonedCard).getByRole("button", { name: /^clone$/i })
    ).toBeInTheDocument();
    const clonedDeleteBtn = within(clonedCard).getByRole("button", {
      name: /delete resume/i,
    });
    expect(clonedDeleteBtn).toBeInTheDocument();

    // Clicking Edit passes the unwrapped cloned resume with normalized id & _id
    fireEvent.click(within(clonedCard).getByRole("button", { name: /^edit$/i }));
    expect(onEditResume).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "cloned-resume-2",
        id: "cloned-resume-2",
        title: "Senior Frontend CV (Copy)",
      })
    );

    // Clicking Delete on the cloned card deletes cloned-resume-2
    fireEvent.click(clonedDeleteBtn);
    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "/api/resumes/cloned-resume-2"
      );
    });

    confirmSpy.mockRestore();
  });
});
