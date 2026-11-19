import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
  useContext,
} from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  PencilIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ShareIcon,
  Bars3Icon,
  TrashIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { useResumeHistory } from "./useResumeHistory";
import { resumeService } from "../services/resume.service";
import {
  dateFields,
  IResume,
  ISection,
  SectionOption,
  SectionType,
} from "../types/resume";
import ResumePreview from "./ResumePreview";
import SectionEditors, { DialogBox } from "./sections";
import { defaultResume } from "../constants/editorConstants";
import ShareModal from "./ShareModal";
import ReauthModal from "./ReauthModal";
import { formatResumeDate } from "../utils/date";
import { processProfilePhoto } from "../utils/imageCompression";
import {
  authEventBus,
  AuthModalContext,
  isUnauthorizedError,
} from "../utils/authEventBus";
import { getStoredUser } from "../utils/token";

interface ResumeEditorProps {
  initialResume?: IResume;
  onSave?: (resume: IResume) => void;
  onBack: () => void;
}

const sectionOptions: SectionOption[] = [
  {
    id: "education",
    type: SectionType.EDUCATION,
    title: "Education",
    description:
      "Show off your primary education, college degrees & exchange semesters.",
  },
  {
    id: "work",
    type: SectionType.WORK,
    title: "Professional Experience",
    description:
      "A place to highlight your professional experience - including internships.",
  },
  {
    id: "skills",
    type: SectionType.SKILLS,
    title: "Skills",
    description:
      "List your technical, managerial or soft skills in this section.",
  },
  {
    id: "languages",
    type: SectionType.LANGUAGES,
    title: "Languages",
    description:
      "You speak more than one language? Make sure to list them here.",
  },
  {
    id: "certificates",
    type: SectionType.CERTIFICATES,
    title: "Certificates",
    description:
      "Drivers licenses and other industry-specific certificates you have belong here.",
  },
  {
    id: "interests",
    type: SectionType.INTERESTS,
    title: "Interests",
    description:
      "Do you have interests that align with your career aspiration?",
  },
  {
    id: "projects",
    type: SectionType.PROJECTS,
    title: "Projects",
    description:
      "Worked on a particular challenging project in the past? Mention it here.",
  },
  {
    id: "courses",
    type: SectionType.COURSES,
    title: "Courses",
    description:
      "Did you complete MOOCs or an evening course? Show them off in this section.",
  },
  {
    id: "awards",
    type: SectionType.AWARDS,
    title: "Awards",
    description:
      "Awards like student competitions or industry accolades belong here.",
  },
  {
    id: "organizations",
    type: SectionType.ORGANIZATIONS,
    title: "Organisations",
    description:
      "If you volunteer or participate in a good cause, why not state it?",
  },
  {
    id: "publications",
    type: SectionType.PUBLICATIONS,
    title: "Publications",
    description:
      "Academic publications or book releases have a dedicated place here.",
  },
  {
    id: "references",
    type: SectionType.REFERENCES,
    title: "References",
    description:
      "If you have former colleagues or bosses that vouch for you, list them.",
  },
  {
    id: "softSkills",
    type: SectionType.SOFTSKILSS,
    title: "Soft Skills",
    description: "Highlight your interpersonal and communication abilities.",
  },
  {
    id: "achievements",
    type: SectionType.ACHIVEMENTS,
    title: "Achievements",
    description: "Showcase your notable accomplishments and milestones.",
  },
  {
    id: "technicalSkills",
    type: SectionType.TECK_SKILLS,
    title: "Technical Skills",
    description:
      "List your programming languages, tools, and technical expertise.",
  },
];

type SaveStatus = "unsaved_new" | "saving" | "saved" | "failed";
type SaveOrigin = "autosave" | "manual" | "retry";
type SaveResult = { ok: true; data: any } | { ok: false; error: unknown };

const EXPORT_COOLDOWN_MS = 500;

function extractCreatedResumeId(saved: any): string | undefined {
  return saved?._id || saved?.id || saved?.data?._id || saved?.data?.id;
}

function serializeResumeSnapshot(input: IResume): string {
  return JSON.stringify({
    title: input.title ?? "",
    summary: input.summary ?? "",
    templateId: input.templateId ?? "",
    themeConfig: input.themeConfig ?? null,
    sharing: input.sharing ?? null,
    content: input.content,
  });
}

function createDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  delayMs: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingArgs = null;
  };

  const flush = () => {
    if (timeoutId !== null && pendingArgs !== null) {
      const args = pendingArgs;
      clearTimeout(timeoutId);
      timeoutId = null;
      pendingArgs = null;
      fn(...args);
    }
  };

  const pending = () => timeoutId !== null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    pendingArgs = args;
    timeoutId = setTimeout(() => {
      const args = pendingArgs;
      timeoutId = null;
      pendingArgs = null;
      if (args !== null) {
        fn(...args);
      }
    }, delayMs);
  };

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}

export function normalizeResume(input?: IResume): IResume {
  const source = input || defaultResume;
  const basics = source.content?.basics || defaultResume.content.basics;
  const rawBasicsSummary = basics?.summary;
  const rawTopSummary = source.summary;

  const resolvedSummary =
    typeof rawBasicsSummary === "string" && rawBasicsSummary.length > 0
      ? rawBasicsSummary
      : typeof rawTopSummary === "string" && rawTopSummary.length > 0
      ? rawTopSummary
      : rawBasicsSummary ?? rawTopSummary ?? "";

  const sections = Array.isArray(source.content?.sections)
    ? source.content.sections
    : [];
  const rawOrder = Array.isArray(source.content?.sectionOrder)
    ? source.content.sectionOrder
    : [];
  const missingIds = sections
    .map((s) => s.id)
    .filter((id) => !rawOrder.includes(id));
  const resolvedId = source._id || source.id;

  return {
    ...defaultResume,
    ...source,
    ...(resolvedId
      ? {
          _id: source._id || resolvedId,
          id: source.id || resolvedId,
        }
      : {}),
    title: source.title ?? defaultResume.title ?? "Untitled Resume",
    summary: resolvedSummary,
    content: {
      ...defaultResume.content,
      ...source.content,
      basics: {
        ...defaultResume.content.basics,
        ...basics,
        name: basics?.name ?? "",
        label: basics?.label ?? "",
        email: basics?.email ?? "",
        phone: basics?.phone ?? "",
        summary: resolvedSummary,
        location: {
          ...defaultResume.content.basics.location,
          ...(basics?.location || {}),
        },
      },
      sections,
      sectionOrder: [...rawOrder, ...missingIds],
    },
  };
}

function formatItemDateRange(item: any): string {
  const start = formatResumeDate(item?.startDate);
  const end = formatResumeDate(item?.endDate);
  const single = formatResumeDate(item?.date);

  if (start) {
    const endLabel = item?.current || !end ? "Present" : end;
    return `${start} – ${endLabel}`;
  }
  if (item?.current) {
    return "Present";
  }
  return end || single || "";
}

export function getItemDisplayLines(
  sectionType: SectionType,
  item: any
): { primary: string; secondary: string } {
  if (!item) {
    return { primary: "Untitled Item", secondary: "" };
  }

  const dateRange = formatItemDateRange(item);

  switch (sectionType) {
    case SectionType.WORK: {
      const company = (item.company || item.name || "").trim();
      const position = (item.position || "").trim();
      const primary = company || position || "Untitled Role";
      const secondary = [
        company && position ? position : "",
        dateRange,
        item.location,
      ]
        .filter(Boolean)
        .join(" · ");
      return { primary, secondary };
    }

    case SectionType.EDUCATION: {
      const institution = (item.institution || "").trim();
      const degree = (item.degree || "").trim();
      const field = (item.field || "").trim();

      if (institution) {
        const degreeField = [degree, field].filter(Boolean).join(" in ");
        return {
          primary: institution,
          secondary: [degreeField, dateRange, item.location]
            .filter(Boolean)
            .join(" · "),
        };
      }

      const primary = degree || field || "Untitled Education";
      const secondary = [degree && field ? field : "", dateRange, item.location]
        .filter(Boolean)
        .join(" · ");
      return { primary, secondary };
    }

    case SectionType.SKILLS:
    case SectionType.TECK_SKILLS:
    case SectionType.SOFTSKILSS: {
      const primary = (item.name || item.title || "").trim() || "Untitled Skill";
      const levelStr =
        typeof item.level === "number"
          ? item.level <= 5
            ? `Level ${item.level}/5`
            : `${item.level}%`
          : typeof item.level === "string"
          ? item.level.trim()
          : "";
      const tags = Array.isArray(item.technologies)
        ? item.technologies.join(", ")
        : Array.isArray(item.subSkills)
        ? item.subSkills.join(", ")
        : "";
      return {
        primary,
        secondary: [levelStr, tags].filter(Boolean).join(" · "),
      };
    }

    case SectionType.PROJECTS: {
      const primary =
        (item.name || item.title || "").trim() || "Untitled Project";
      const techs = Array.isArray(item.technologies)
        ? item.technologies.join(", ")
        : "";
      const secondary =
        [dateRange, techs, item.url].filter(Boolean).join(" · ") ||
        (item.description || "").trim();
      return { primary, secondary };
    }

    case SectionType.LANGUAGES: {
      const primary =
        (item.name || item.language || "").trim() || "Untitled Language";
      const fluency = (item.fluency || item.level || "").trim();
      const prof =
        typeof item.proficiency === "number" ? `${item.proficiency}%` : "";
      return {
        primary,
        secondary: [fluency, prof].filter(Boolean).join(" · "),
      };
    }

    case SectionType.CERTIFICATES: {
      const primary =
        (item.name || item.title || "").trim() || "Untitled Certificate";
      return {
        primary,
        secondary: [item.issuer, dateRange].filter(Boolean).join(" · "),
      };
    }

    case SectionType.COURSES: {
      const primary =
        (item.course || item.name || "").trim() || "Untitled Course";
      return {
        primary,
        secondary: [item.institution, dateRange].filter(Boolean).join(" · "),
      };
    }

    case SectionType.AWARDS:
    case SectionType.ACHIVEMENTS: {
      const primary =
        (item.title || item.name || "").trim() || "Untitled Award";
      return {
        primary,
        secondary: [item.awarder || item.issuer, dateRange]
          .filter(Boolean)
          .join(" · "),
      };
    }

    case SectionType.ORGANIZATIONS: {
      const primary =
        (item.organization || item.name || "").trim() ||
        "Untitled Organization";
      return {
        primary,
        secondary: [item.position, dateRange].filter(Boolean).join(" · "),
      };
    }

    case SectionType.PUBLICATIONS: {
      const primary =
        (item.title || item.name || "").trim() || "Untitled Publication";
      return {
        primary,
        secondary: [item.publisher, dateRange].filter(Boolean).join(" · "),
      };
    }

    case SectionType.REFERENCES: {
      const primary = (item.name || "").trim() || "Untitled Reference";
      const roleAtCo = [item.position, item.company]
        .filter(Boolean)
        .join(" at ");
      return {
        primary,
        secondary: [roleAtCo, item.contact || item.email || item.phone]
          .filter(Boolean)
          .join(" · "),
      };
    }

    default: {
      const primary =
        (
          item.title ||
          item.name ||
          item.institution ||
          item.company ||
          item.degree ||
          ""
        ).trim() || "Untitled Item";
      const secondary =
        [item.subtitle || item.position, dateRange, item.location]
          .filter(Boolean)
          .join(" · ") || (item.description || "").trim();
      return { primary, secondary };
    }
  }
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return true;
    }
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return isDesktop;
}

interface SortableItemProps {
  id: string;
  section: ISection;
  onAddItem: (section: ISection) => void;
  onDeleteSection: (section: ISection) => void;
  onRemove: (sectionId: string, itemId: string) => void;
  onEdit: (type: SectionType, item: any, sectionId: string) => void;
  onHide: (sectionId: string, itemId: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  section,
  onAddItem,
  onDeleteSection,
  onRemove,
  onEdit,
  onHide,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  const itemCount = section.content?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow ${
        isDragging ? "ring-2 ring-blue-500 shadow-lg opacity-90" : "hover:shadow-md"
      }`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 bg-neutral-50/80 border-b border-gray-100 rounded-t-xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            style={{ touchAction: "none" }}
            className="cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={`Drag to reorder ${section.title}`}
            aria-label={`Drag to reorder ${section.title}`}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {section.title}
          </h3>
          <span className="text-xs font-medium text-gray-600 bg-gray-200/70 px-2 py-0.5 rounded-full shrink-0">
            {itemCount}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onAddItem(section)}
            title={`Add item to ${section.title}`}
            aria-label={`Add item to ${section.title}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add</span>
          </button>
          <button
            type="button"
            onClick={() => onDeleteSection(section)}
            title={`Remove ${section.title} section`}
            aria-label={`Remove ${section.title} section`}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Section Items */}
      <div className="p-4 sm:p-5">
        {section.content && section.content.length > 0 ? (
          <div className="space-y-2.5">
            {section.content.map((item: any) => {
              const { primary, secondary } = getItemDisplayLines(
                section.type,
                item
              );
              const isHidden = item.enabled === false;

              return (
                <div
                  key={item.id}
                  className={`px-3.5 py-3 border rounded-lg transition-colors flex items-center justify-between gap-3 ${
                    isHidden
                      ? "border-gray-200 bg-neutral-50 opacity-65"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:bg-neutral-50/50"
                  }`}
                >
                  <div
                    onClick={() => onEdit(section.type, item, section.id)}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {primary}
                      </p>
                      {isHidden && (
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-200/80 text-gray-600 shrink-0">
                          Hidden
                        </span>
                      )}
                    </div>
                    {secondary && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {secondary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onHide(section.id, item.id)}
                      title={
                        isHidden
                          ? "Show item on resume"
                          : "Hide item from resume"
                      }
                      aria-label={
                        isHidden ? `Show ${primary}` : `Hide ${primary}`
                      }
                      className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {isHidden ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(section.type, item, section.id)}
                      title={`Edit ${primary}`}
                      aria-label={`Edit ${primary}`}
                      className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(section.id, item.id)}
                      title={`Remove ${primary}`}
                      aria-label={`Remove ${primary}`}
                      className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 px-4 rounded-lg border border-dashed border-gray-200 bg-neutral-50/60 text-sm text-gray-500">
            <p>No items yet. Click Add to include entries in {section.title}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ResumeEditor: React.FC<ResumeEditorProps> = ({
  initialResume,
  onSave,
  onBack,
}) => {
  const { resume, setResume, undo, redo, canUndo, canRedo } = useResumeHistory(
    normalizeResume(initialResume)
  );
  const { hasGlobalModal } = useContext(AuthModalContext);
  const isDesktop = useIsDesktop();
  const initialResumeId = initialResume?._id || initialResume?.id;
  const [loading, setLoading] = useState(false);
  const [persistedId, setPersistedId] = useState<string | undefined>(
    () => initialResumeId
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(() =>
    initialResumeId ? "saved" : "unsaved_new"
  );
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [reauthDismissed, setReauthDismissed] = useState(false);
  const [showLocalReauthModal, setShowLocalReauthModal] = useState(false);
  const [reauthEmail, setReauthEmail] = useState<string>(
    () => getStoredUser()?.email || initialResume?.content?.basics?.email || ""
  );
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomSectionModal, setShowCustomSectionModal] = useState(false);
  const [customSectionTitle, setCustomSectionTitle] = useState("");
  const [activeView, setActiveView] = useState<"editor" | "preview">("editor");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [addContent, setAddContent] = useState<{
    type: SectionType;
    item: any;
    sectionId?: string;
  } | null>(null);
  const [deletableSection, setDeletableSection] = useState<ISection | null>(
    null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const prevInitialResumeRef = useRef<IResume | undefined>(initialResume);
  const isInitialMountRef = useRef(true);
  const isMountedRef = useRef(true);
  const latestResumeRef = useRef<IResume>(resume);
  latestResumeRef.current = resume;
  const persistedIdRef = useRef<string | undefined>(persistedId);
  persistedIdRef.current = persistedId;
  const saveStatusRef = useRef<SaveStatus>(saveStatus);
  saveStatusRef.current = saveStatus;
  const initialBlankSnapshotRef = useRef<string>(
    serializeResumeSnapshot(resume)
  );
  const lastSavedSnapshotRef = useRef<string | null>(
    initialResumeId ? serializeResumeSnapshot(resume) : null
  );
  const hasShownAutoSaveErrorToastRef = useRef(false);
  const sessionExpiredRef = useRef(false);
  const pendingRetryAfterAuthRef = useRef(false);
  const hasGlobalModalRef = useRef(hasGlobalModal);
  hasGlobalModalRef.current = hasGlobalModal;
  const isSavingRef = useRef(false);
  const queuedSaveRef = useRef<{
    resume: IResume;
    origin: SaveOrigin;
    resolvers: Array<(result: SaveResult) => void>;
  } | null>(null);
  const titleBeforeEditRef = useRef<string>(resume.title || "");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const isExportingRef = useRef(false);
  const exportCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const effectiveResumeId = resume._id || resume.id || persistedId;

  const updateSaveStatus = useCallback((next: SaveStatus) => {
    saveStatusRef.current = next;
    if (isMountedRef.current) {
      setSaveStatus(next);
    }
  }, []);

  const enqueueSave = useCallback(
    (targetResume: IResume, origin: SaveOrigin): Promise<SaveResult> => {
      return new Promise((resolve) => {
        if (isSavingRef.current) {
          if (!queuedSaveRef.current) {
            queuedSaveRef.current = {
              resume: targetResume,
              origin,
              resolvers: [resolve],
            };
          } else {
            queuedSaveRef.current.resume = targetResume;
            if (origin === "manual") {
              queuedSaveRef.current.origin = "manual";
            } else if (
              origin === "retry" &&
              queuedSaveRef.current.origin === "autosave"
            ) {
              queuedSaveRef.current.origin = "retry";
            }
            queuedSaveRef.current.resolvers.push(resolve);
          }

          if (origin === "manual" || origin === "retry") {
            updateSaveStatus("saving");
          }
          return;
        }

        isSavingRef.current = true;
        if (
          origin === "manual" ||
          origin === "retry" ||
          saveStatusRef.current !== "failed"
        ) {
          updateSaveStatus("saving");
        }

        const runLoop = async (
          firstResume: IResume,
          firstOrigin: SaveOrigin,
          firstResolvers: Array<(result: SaveResult) => void>
        ) => {
          let currentResume = firstResume;
          let currentOrigin = firstOrigin;
          let currentResolvers = firstResolvers;

          while (true) {
            const activeId =
              currentResume._id || currentResume.id || persistedIdRef.current;

            if (!activeId && currentOrigin === "autosave") {
              for (let i = 0; i < currentResolvers.length; i += 1) {
                currentResolvers[i]({ ok: true, data: currentResume });
              }
            } else {
              const snapshotAttempted = serializeResumeSnapshot(currentResume);
              try {
                let savedData: any;
                if (activeId) {
                  const payload = currentResume._id
                    ? currentResume
                    : { ...currentResume, _id: activeId };
                  savedData = await resumeService.updateResume(
                    activeId,
                    payload
                  );
                } else {
                  savedData = await resumeService.createResume(currentResume);
                  const createdId = extractCreatedResumeId(savedData);
                  if (createdId) {
                    persistedIdRef.current = createdId;
                    if (isMountedRef.current) {
                      setPersistedId(createdId);
                    }
                  }
                }

                lastSavedSnapshotRef.current = snapshotAttempted;
                hasShownAutoSaveErrorToastRef.current = false;

                if (!queuedSaveRef.current) {
                  updateSaveStatus("saved");
                }
                for (let i = 0; i < currentResolvers.length; i += 1) {
                  currentResolvers[i]({ ok: true, data: savedData });
                }
              } catch (error) {
                const unauthorized =
                  isUnauthorizedError(error) || sessionExpiredRef.current;

                if (unauthorized) {
                  pendingRetryAfterAuthRef.current = true;
                  if (!sessionExpiredRef.current) {
                    sessionExpiredRef.current = true;
                    if (isMountedRef.current) {
                      setIsSessionExpired(true);
                      setReauthDismissed(false);
                    }
                    authEventBus.emitSessionExpired({
                      email:
                        getStoredUser()?.email ||
                        latestResumeRef.current.content?.basics?.email ||
                        "",
                    });
                  }
                  if (queuedSaveRef.current) {
                    const pendingQueued = queuedSaveRef.current;
                    queuedSaveRef.current = null;
                    for (let i = 0; i < pendingQueued.resolvers.length; i += 1) {
                      pendingQueued.resolvers[i]({ ok: false, error });
                    }
                  }
                  updateSaveStatus("failed");
                } else {
                  if (
                    currentOrigin === "autosave" &&
                    !hasShownAutoSaveErrorToastRef.current
                  ) {
                    hasShownAutoSaveErrorToastRef.current = true;
                    toast.error("Auto-save failed");
                  }
                  if (!queuedSaveRef.current) {
                    updateSaveStatus("failed");
                  }
                }
                for (let i = 0; i < currentResolvers.length; i += 1) {
                  currentResolvers[i]({ ok: false, error });
                }
              }
            }

            if (queuedSaveRef.current) {
              const nextBatch = queuedSaveRef.current;
              queuedSaveRef.current = null;
              currentResume = nextBatch.resume;
              currentOrigin = nextBatch.origin;
              currentResolvers = nextBatch.resolvers;
              if (
                currentOrigin === "manual" ||
                currentOrigin === "retry" ||
                saveStatusRef.current !== "failed"
              ) {
                updateSaveStatus("saving");
              }
            } else {
              isSavingRef.current = false;
              break;
            }
          }
        };

        void runLoop(targetResume, origin, [resolve]);
      });
    },
    [updateSaveStatus]
  );

  const debouncedAutoSave = useMemo(
    () =>
      createDebouncedCallback((resumeToSave: IResume) => {
        if (sessionExpiredRef.current) return;
        const activeId =
          resumeToSave._id || resumeToSave.id || persistedIdRef.current;
        if (!activeId) return;
        void enqueueSave(resumeToSave, "autosave");
      }, 2000),
    [enqueueSave]
  );

  const hasUnsavedChanges = useCallback((): boolean => {
    if (
      isSavingRef.current ||
      debouncedAutoSave.pending() ||
      pendingRetryAfterAuthRef.current
    ) {
      return true;
    }
    const currentSnapshot = serializeResumeSnapshot(latestResumeRef.current);
    if (lastSavedSnapshotRef.current !== null) {
      return currentSnapshot !== lastSavedSnapshotRef.current;
    }
    return currentSnapshot !== initialBlankSnapshotRef.current;
  }, [debouncedAutoSave]);

  const handleReopenReauth = useCallback(() => {
    const emailHint =
      reauthEmail ||
      getStoredUser()?.email ||
      latestResumeRef.current.content?.basics?.email ||
      "";
    setReauthDismissed(false);
    if (!hasGlobalModalRef.current) {
      setShowLocalReauthModal(true);
    }
    authEventBus.emitOpenReauth({ email: emailHint });
  }, [reauthEmail]);

  useEffect(() => {
    const unsubscribeExpired = authEventBus.onSessionExpired((detail) => {
      const hadUnsavedOrActiveSave =
        isSavingRef.current ||
        debouncedAutoSave.pending() ||
        hasUnsavedChanges();
      debouncedAutoSave.cancel();
      sessionExpiredRef.current = true;
      if (hadUnsavedOrActiveSave) {
        pendingRetryAfterAuthRef.current = true;
      }
      if (isMountedRef.current) {
        if (detail.email) {
          setReauthEmail(detail.email);
        }
        setIsSessionExpired(true);
        setReauthDismissed(false);
        if (!hasGlobalModalRef.current) {
          setShowLocalReauthModal(true);
        }
        if (
          hadUnsavedOrActiveSave &&
          (latestResumeRef.current._id ||
            latestResumeRef.current.id ||
            persistedIdRef.current)
        ) {
          updateSaveStatus("failed");
        }
      }
    });

    const unsubscribeOpen = authEventBus.onOpenReauth((detail) => {
      if (!isMountedRef.current) return;
      if (detail.email) {
        setReauthEmail(detail.email);
      }
      setReauthDismissed(false);
      if (!hasGlobalModalRef.current) {
        setShowLocalReauthModal(true);
      }
    });

    const unsubscribeDismissed = authEventBus.onReauthDismissed(() => {
      debouncedAutoSave.cancel();
      if (!isMountedRef.current) return;
      setReauthDismissed(true);
      setShowLocalReauthModal(false);
    });

    const unsubscribeReauthenticated = authEventBus.onReauthenticated(
      (detail) => {
        const shouldRetry =
          pendingRetryAfterAuthRef.current || hasUnsavedChanges();
        sessionExpiredRef.current = false;
        pendingRetryAfterAuthRef.current = false;
        debouncedAutoSave.cancel();

        if (isMountedRef.current) {
          if (detail.user?.email) {
            setReauthEmail(detail.user.email);
          }
          setIsSessionExpired(false);
          setReauthDismissed(false);
          setShowLocalReauthModal(false);
        }

        const activeId =
          latestResumeRef.current._id ||
          latestResumeRef.current.id ||
          persistedIdRef.current;
        if (
          shouldRetry &&
          (activeId || saveStatusRef.current === "failed")
        ) {
          void enqueueSave(latestResumeRef.current, "retry").then((result) => {
            if (result.ok && isMountedRef.current) {
              toast.success("Resume saved successfully!");
            }
          });
        }
      }
    );

    return () => {
      unsubscribeExpired();
      unsubscribeOpen();
      unsubscribeDismissed();
      unsubscribeReauthenticated();
    };
  }, [debouncedAutoSave, enqueueSave, hasUnsavedChanges, updateSaveStatus]);

  useEffect(() => {
    if (initialResume && initialResume !== prevInitialResumeRef.current) {
      prevInitialResumeRef.current = initialResume;
      debouncedAutoSave.cancel();
      const normalized = normalizeResume(initialResume);
      const nextId = normalized._id || normalized.id;
      persistedIdRef.current = nextId;
      setPersistedId(nextId);
      const snap = serializeResumeSnapshot(normalized);
      initialBlankSnapshotRef.current = snap;
      lastSavedSnapshotRef.current = nextId ? snap : null;
      hasShownAutoSaveErrorToastRef.current = false;
      updateSaveStatus(nextId ? "saved" : "unsaved_new");
      setResume(normalized);
    }
  }, [initialResume, setResume, debouncedAutoSave, updateSaveStatus]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!showOverflowMenu) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        overflowMenuRef.current &&
        !overflowMenuRef.current.contains(event.target as Node)
      ) {
        setShowOverflowMenu(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowOverflowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showOverflowMenu]);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleChange = (section: string, value: any) => {
    setResume((prev) => {
      const nextSummary =
        section === "basics" && value?.summary !== undefined
          ? value.summary
          : prev.summary;
      return {
        ...prev,
        summary: nextSummary,
        content: {
          ...prev.content,
          [section]: value,
        },
      };
    });
  };

  const handlePreviewChange = (updatedResume: IResume) => {
    const syncedSummary =
      updatedResume.content?.basics?.summary ?? updatedResume.summary ?? "";
    setResume({
      ...updatedResume,
      summary: syncedSummary,
      content: {
        ...updatedResume.content,
        basics: {
          ...updatedResume.content.basics,
          summary: syncedSummary,
        },
      },
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) {
      e.target.value = "";
    }
    if (!file) return;

    setPhotoError(null);
    setIsUploadingPhoto(true);
    try {
      const processedDataUrl = await processProfilePhoto(file);
      if (!isMountedRef.current) return;

      setResume((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          basics: {
            ...prev.content.basics,
            image: processedDataUrl,
          },
        },
        ...(prev.themeConfig?.photo?.show === false
          ? {
              themeConfig: {
                ...prev.themeConfig,
                photo: {
                  ...prev.themeConfig.photo,
                  show: true,
                },
              },
            }
          : {}),
      }));
      toast.success("Profile photo updated");
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const message =
        err?.message ||
        "Unsupported file format. Please upload a PNG, JPG, or WebP image.";
      setPhotoError(message);
      toast.error(message);
    } finally {
      if (isMountedRef.current) {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoError(null);
    setResume((prev) => {
      const nextBasics = { ...prev.content.basics };
      delete nextBasics.image;
      return {
        ...prev,
        content: {
          ...prev.content,
          basics: nextBasics,
        },
      };
    });
    toast.success("Profile photo removed");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setResume((prev) => {
        const currentOrder = prev.content.sectionOrder;
        const oldIndex = currentOrder.indexOf(active.id.toString());
        const newIndex = currentOrder.indexOf(over.id.toString());
        if (oldIndex === -1 || newIndex === -1) {
          return prev;
        }

        return {
          ...prev,
          content: {
            ...prev.content,
            sectionOrder: arrayMove(currentOrder, oldIndex, newIndex),
          },
        };
      });
    }
  };

  const handleAddSection = (section: SectionOption) => {
    setShowSectionModal(false);
    setSearchTerm("");
    const newSection: ISection = {
      id: `${section.id}-${Date.now()}`,
      type: section.type,
      title: section.title,
      content: [],
    };

    setResume((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        sections: [...prev.content.sections, newSection],
        sectionOrder: [...prev.content.sectionOrder, newSection.id],
      },
    }));

    toast.success(`${section.title} section added`);
  };

  const handleAddCustomSection = () => {
    if (!customSectionTitle.trim()) {
      toast.error("Please enter a section title");
      return;
    }

    const newSection: ISection = {
      id: `custom-${Date.now()}`,
      type: SectionType.CUSTOM,
      title: customSectionTitle.trim(),
      content: [],
      isCustom: true,
    };

    setResume((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        sections: [...(prev.content?.sections || []), newSection],
        sectionOrder: [...(prev.content?.sectionOrder || []), newSection.id],
      },
    }));

    setShowCustomSectionModal(false);
    setCustomSectionTitle("");
    toast.success("Custom section added");
  };

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (sessionExpiredRef.current) {
      debouncedAutoSave.cancel();
      pendingRetryAfterAuthRef.current = true;
      return;
    }

    const activeId = resume._id || resume.id || persistedIdRef.current;
    if (!activeId) {
      return;
    }

    const currentSnapshot = serializeResumeSnapshot(resume);
    if (
      !isSavingRef.current &&
      lastSavedSnapshotRef.current !== null &&
      currentSnapshot === lastSavedSnapshotRef.current
    ) {
      debouncedAutoSave.cancel();
      return;
    }

    debouncedAutoSave(resume);
  }, [resume, debouncedAutoSave]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (exportCooldownTimerRef.current !== null) {
        clearTimeout(exportCooldownTimerRef.current);
        exportCooldownTimerRef.current = null;
      }
      if (!sessionExpiredRef.current) {
        debouncedAutoSave.flush();
      } else {
        debouncedAutoSave.cancel();
      }
    };
  }, [debouncedAutoSave]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const dirtyBeforeFlush = hasUnsavedChanges();
      if (!sessionExpiredRef.current) {
        debouncedAutoSave.flush();
      }
      if (dirtyBeforeFlush || hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [debouncedAutoSave, hasUnsavedChanges]);

  const handleRetrySave = () => {
    debouncedAutoSave.cancel();
    if (sessionExpiredRef.current) {
      pendingRetryAfterAuthRef.current = true;
      handleReopenReauth();
      return;
    }
    void enqueueSave(latestResumeRef.current, "retry");
  };

  const handleSave = async () => {
    debouncedAutoSave.cancel();
    if (sessionExpiredRef.current) {
      pendingRetryAfterAuthRef.current = true;
      handleReopenReauth();
      return;
    }
    setLoading(true);
    try {
      const result = await enqueueSave(latestResumeRef.current, "manual");
      if (!result.ok) {
        throw result.error;
      }
      toast.success("Resume saved successfully!");
      onSave?.(result.data);
    } catch (error) {
      if (!isUnauthorizedError(error) && !sessionExpiredRef.current) {
        toast.error("Failed to save resume");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleExport = useCallback(() => {
    if (isExportingRef.current || loading) {
      return;
    }

    isExportingRef.current = true;

    flushSync(() => {
      setIsExporting(true);
      setShowOverflowMenu(false);
      if (!isDesktop && activeView !== "preview") {
        setActiveView("preview");
      }
    });

    try {
      if (typeof window !== "undefined" && typeof window.print === "function") {
        window.print();
      }
    } finally {
      if (exportCooldownTimerRef.current !== null) {
        clearTimeout(exportCooldownTimerRef.current);
      }
      exportCooldownTimerRef.current = setTimeout(() => {
        exportCooldownTimerRef.current = null;
        isExportingRef.current = false;
        if (isMountedRef.current) {
          setIsExporting(false);
        }
      }, EXPORT_COOLDOWN_MS);
    }
  }, [activeView, isDesktop, loading]);

  const handleOpenShare = async () => {
    if (!effectiveResumeId) {
      toast("Saving resume before opening share settings...", { icon: "ℹ️" });
      debouncedAutoSave.cancel();
      setLoading(true);
      const result = await enqueueSave(latestResumeRef.current, "manual");
      if (isMountedRef.current) {
        setLoading(false);
      }
      const savedId = result.ok
        ? extractCreatedResumeId(result.data) || persistedIdRef.current
        : undefined;
      if (result.ok && savedId) {
        if (isMountedRef.current) {
          setShowShareModal(true);
        }
      } else {
        toast.error("Failed to save resume before sharing");
      }
      return;
    }
    setShowShareModal(true);
  };

  const handleAddNewItem = (section: ISection) => {
    let newItem: any = {
      id: `${section.id}-item-${Date.now()}`,
    };

    switch (section.type) {
      case SectionType.EDUCATION:
        newItem = {
          ...newItem,
          degree: "",
          field: "",
          startDate: {} as dateFields,
          endDate: {} as dateFields,
          current: false,
          location: "",
          description: "",
        };
        break;

      case SectionType.WORK:
        newItem = {
          ...newItem,
          name: "",
          company: "",
          position: "",
          startDate: "",
          endDate: "",
          current: false,
          location: "",
          description: "",
        };
        break;

      case SectionType.SKILLS:
      case SectionType.TECK_SKILLS:
      case SectionType.SOFTSKILSS:
        newItem = {
          ...newItem,
          name: "",
          level: "Intermediate",
        };
        break;

      case SectionType.LANGUAGES:
        newItem = {
          ...newItem,
          name: "",
          language: "",
          fluency: "",
        };
        break;

      case SectionType.CERTIFICATES:
        newItem = {
          ...newItem,
          name: "",
          issuer: "",
          date: {} as dateFields,
          url: "",
        };
        break;

      case SectionType.INTERESTS:
        newItem = {
          ...newItem,
          name: "",
        };
        break;

      case SectionType.PROJECTS:
        newItem = {
          ...newItem,
          name: "",
          description: "",
          url: "",
          startDate: {} as dateFields,
          endDate: {} as dateFields,
          current: false,
          technologies: [],
        };
        break;

      case SectionType.COURSES:
        newItem = {
          ...newItem,
          name: "",
          course: "",
          institution: "",
          date: {} as dateFields,
          description: "",
        };
        break;

      case SectionType.AWARDS:
      case SectionType.ACHIVEMENTS:
        newItem = {
          ...newItem,
          name: "",
          title: "",
          awarder: "",
          date: {} as dateFields,
          description: "",
        };
        break;

      case SectionType.ORGANIZATIONS:
        newItem = {
          ...newItem,
          name: "",
          organization: "",
          position: "",
          startDate: {} as dateFields,
          endDate: {} as dateFields,
          current: false,
          description: "",
        };
        break;

      case SectionType.PUBLICATIONS:
        newItem = {
          ...newItem,
          title: "",
          publisher: "",
          date: {} as dateFields,
          url: "",
          description: "",
        };
        break;

      case SectionType.REFERENCES:
        newItem = {
          ...newItem,
          name: "",
          position: "",
          company: "",
          phone: "",
          email: "",
          reference: "",
        };
        break;

      case SectionType.CUSTOM:
      default:
        newItem = {
          ...newItem,
          title: "",
          subtitle: "",
          startDate: {} as dateFields,
          endDate: {} as dateFields,
          location: "",
          description: "",
        };
    }

    setAddContent({ type: section.type, item: newItem, sectionId: section.id });
  };

  const handleAddContent = (type: SectionType, item: any) => {
    const targetSectionId = addContent?.sectionId;

    setResume((prev) => {
      const updatedSections = prev.content.sections.map((section) => {
        const matchesSection = targetSectionId
          ? section.id === targetSectionId
          : section.type === type;
        if (!matchesSection) {
          return section;
        }

        const existingContent = section.content || [];
        const existingItemIndex = existingContent.findIndex(
          (contentItem) => contentItem.id === item.id
        );

        if (existingItemIndex !== -1) {
          const updatedContent = [...existingContent];
          updatedContent[existingItemIndex] = item;
          return {
            ...section,
            content: updatedContent,
          };
        }

        return {
          ...section,
          content: [...existingContent, item],
        };
      });

      return {
        ...prev,
        content: {
          ...prev.content,
          sections: updatedSections,
        },
      };
    });

    setAddContent(null);
    toast.success("Content saved successfully");
  };

  const handleDeleteSection = (id: string) => {
    setResume((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        sections: prev.content.sections.filter((section) => section.id !== id),
        sectionOrder: prev.content.sectionOrder.filter(
          (sectionId) => sectionId !== id
        ),
      },
    }));
    setDeletableSection(null);
    toast.success("Section deleted successfully");
  };

  const handleToggleItemVisibility = (sectionId: string, itemId: string) => {
    setResume((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        sections: prev.content.sections.map((section) => {
          if (section.id !== sectionId) return section;
          return {
            ...section,
            content: section.content.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    enabled: item.enabled === false ? true : false,
                  }
                : item
            ),
          };
        }),
      },
    }));
  };

  const handleRemoveItem = (sectionId: string, itemId: string) => {
    setResume((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        sections: prev.content.sections.map((section) => {
          if (section.id !== sectionId) return section;
          return {
            ...section,
            content: section.content.filter((item) => item.id !== itemId),
          };
        }),
      },
    }));
  };

  const orderedSections = useMemo(() => {
    const sections = resume?.content?.sections || [];
    const order = resume?.content?.sectionOrder || [];
    const fromOrder = order
      .map((id) => sections.find((section) => section.id === id))
      .filter((section): section is ISection => section !== undefined);
    const missing = sections.filter((s) => !order.includes(s.id));
    return [...fromOrder, ...missing];
  }, [resume]);

  const filteredSections = useMemo(() => {
    const selectedSectionTypes = (resume?.content?.sections || []).map(
      (section) => section.type
    );
    const query = searchTerm.trim().toLowerCase();

    return sectionOptions.filter((section) => {
      const isAvailable =
        !selectedSectionTypes.includes(section.type) ||
        section.type === SectionType.CUSTOM;
      if (!isAvailable) return false;
      if (!query) return true;
      return (
        section.title.toLowerCase().includes(query) ||
        section.description.toLowerCase().includes(query)
      );
    });
  }, [resume, searchTerm]);

  const summaryValue =
    resume.content?.basics?.summary ?? resume.summary ?? "";

  const editorToolbar = (
    <div
      data-testid="resume-editor-toolbar"
      className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 shrink-0 relative z-30 print:hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-[220px] sm:min-w-[260px] flex-1">
            <button
              type="button"
              onClick={onBack}
              title="Back to resumes"
              aria-label="Back"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shrink-0"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Back</span>
            </button>

            <div className="h-5 w-px bg-gray-200 shrink-0" aria-hidden="true" />

            <div className="min-w-0 flex-1">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  aria-label="Resume Title"
                  value={resume.title || ""}
                  onChange={(e) =>
                    setResume((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setIsEditingTitle(false);
                    } else if (e.key === "Escape") {
                      setResume((prev) => ({
                        ...prev,
                        title: titleBeforeEditRef.current,
                      }));
                      setIsEditingTitle(false);
                    }
                  }}
                  placeholder="Resume Title"
                  className="w-full max-w-xl text-base sm:text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-blue-600 focus:outline-none px-1 py-0.5"
                />
              ) : (
                <button
                  type="button"
                  data-testid="resume-title-heading"
                  onClick={() => {
                    titleBeforeEditRef.current = resume.title || "";
                    setIsEditingTitle(true);
                  }}
                  title="Click to rename resume"
                  aria-label="Edit resume title"
                  className="group inline-flex items-center gap-1.5 max-w-full text-left rounded-md px-1.5 py-1 -mx-1.5 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <h1
                    title={resume.title || "Untitled Resume"}
                    className="text-base sm:text-lg font-semibold text-gray-900 truncate"
                  >
                    {resume.title || "Untitled Resume"}
                  </h1>
                  <PencilSquareIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-colors" />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              data-testid="save-status-indicator"
              role="status"
              aria-live="polite"
              className="inline-flex items-center text-xs font-medium"
            >
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-primary-50 text-primary-700 border border-primary-200">
                  <ArrowPathIcon
                    className="h-3.5 w-3.5 text-primary-600 animate-spin shrink-0"
                    aria-hidden="true"
                  />
                  <span>Saving…</span>
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-neutral-50 text-neutral-600 border border-neutral-200">
                  <CheckCircleIcon
                    className="h-3.5 w-3.5 text-emerald-600 shrink-0"
                    aria-hidden="true"
                  />
                  <span>All changes saved</span>
                </span>
              )}
              {saveStatus === "failed" && (
                <button
                  type="button"
                  onClick={handleRetrySave}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-colors focus-ring"
                >
                  <ExclamationCircleIcon
                    className="h-3.5 w-3.5 text-red-600 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="underline underline-offset-2">
                    Save failed - Retry
                  </span>
                </button>
              )}
              {saveStatus === "unsaved_new" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-neutral-100 text-neutral-600 border border-neutral-200">
                  <ClockIcon
                    className="h-3.5 w-3.5 text-neutral-500 shrink-0"
                    aria-hidden="true"
                  />
                  <span>Not saved yet</span>
                </span>
              )}
            </div>

            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                title="Undo"
                aria-label="Undo"
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-neutral-50 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                title="Redo"
                aria-label="Redo"
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-neutral-50 border-l border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ArrowUturnRightIcon className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenShare}
              disabled={loading}
              title="Share Resume & Privacy Settings"
              data-testid="share-resume-btn-1"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              <ShareIcon className="h-4 w-4 text-gray-500" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Save</span>
            </button>

            {/* Secondary Actions Overflow Menu */}
            <div className="relative" ref={overflowMenuRef}>
              <button
                type="button"
                onClick={() => setShowOverflowMenu((prev) => !prev)}
                title="More actions"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={showOverflowMenu}
                data-testid="toolbar-overflow-btn"
                className="p-1.5 border border-gray-300 rounded-lg text-gray-600 bg-white hover:bg-neutral-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <EllipsisVerticalIcon className="h-5 w-5" />
              </button>

              {showOverflowMenu && (
                <div
                  role="menu"
                  aria-label="Secondary resume actions"
                  className="absolute right-0 mt-1.5 w-44 rounded-lg bg-white border border-gray-200 shadow-lg py-1 z-30"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setResume((prev) => ({
                        ...prev,
                        title: `${prev.title || "Untitled Resume"} (Copy)`,
                      }));
                      setShowOverflowMenu(false);
                      toast.success("Prepared copy title");
                    }}
                    className="w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-neutral-50 hover:text-gray-900 flex items-center gap-2.5 transition-colors"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4 text-gray-500" />
                    <span>Clone</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="export-resume-btn"
                    onClick={handleExport}
                    disabled={loading || isExporting}
                    className="w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-neutral-50 hover:text-gray-900 flex items-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 text-gray-500" />
                    <span>Export</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );

  const editorPanelContent = (
    <div className="h-full min-h-0 flex flex-col bg-neutral-50 text-gray-900 print:hidden">
      {/* Scrollable Editor Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 pb-10 space-y-4">
        {/* Basic Information Card */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 bg-neutral-50/80 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Basic Information
            </h2>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Profile Photo Upload & Controls */}
            <div
              data-testid="profile-photo-section"
              className="flex flex-col sm:flex-row sm:items-center gap-3.5 p-3.5 rounded-xl bg-neutral-50/90 border border-gray-200/80"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 bg-white flex items-center justify-center shrink-0 shadow-sm">
                {isUploadingPhoto ? (
                  <ArrowPathIcon
                    className="h-6 w-6 text-blue-600 animate-spin"
                    aria-label="Processing photo"
                  />
                ) : resume.content.basics.image ? (
                  <img
                    src={resume.content.basics.image}
                    alt="Profile preview"
                    data-testid="editor-profile-photo-preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PhotoIcon
                    className="h-7 w-7 text-gray-400"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="basics-photo-upload"
                    className="text-sm font-medium text-gray-800"
                  >
                    Profile Photo
                  </label>
                  <span className="text-[11px] font-medium text-gray-500">
                    Optional
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  PNG, JPG, or WebP · Resized up to 400px and compressed under 150 KB
                </p>

                <input
                  ref={photoInputRef}
                  id="basics-photo-upload"
                  data-testid="profile-photo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="sr-only"
                />

                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <button
                    type="button"
                    data-testid="upload-photo-btn"
                    disabled={isUploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-neutral-50 text-xs font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                  >
                    <PhotoIcon className="h-4 w-4 text-gray-500 shrink-0" />
                    <span>
                      {isUploadingPhoto
                        ? "Processing…"
                        : resume.content.basics.image
                        ? "Change Photo"
                        : "Upload Photo"}
                    </span>
                  </button>

                  {resume.content.basics.image && (
                    <button
                      type="button"
                      data-testid="remove-photo-btn"
                      disabled={isUploadingPhoto}
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-medium text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                    >
                      <TrashIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {resume.content.basics.image && resume.themeConfig?.atsMode && (
                  <p className="text-xs text-amber-700 mt-1.5">
                    Photo is saved and currently hidden in preview while ATS mode is enabled.
                  </p>
                )}

                {photoError && (
                  <p
                    role="alert"
                    data-testid="profile-photo-error"
                    className="text-xs text-red-600 font-medium mt-1.5"
                  >
                    {photoError}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="basics-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="basics-name"
                  type="text"
                  value={resume.content.basics.name || ""}
                  onChange={(e) =>
                    handleChange("basics", {
                      ...resume.content.basics,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="basics-label"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Professional Title
                </label>
                <input
                  id="basics-label"
                  type="text"
                  value={resume.content.basics.label || ""}
                  onChange={(e) =>
                    handleChange("basics", {
                      ...resume.content.basics,
                      label: e.target.value,
                    })
                  }
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="basics-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="basics-email"
                  type="email"
                  value={resume.content.basics.email || ""}
                  onChange={(e) =>
                    handleChange("basics", {
                      ...resume.content.basics,
                      email: e.target.value,
                    })
                  }
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="basics-phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone
                </label>
                <input
                  id="basics-phone"
                  type="tel"
                  value={resume.content.basics.phone || ""}
                  onChange={(e) =>
                    handleChange("basics", {
                      ...resume.content.basics,
                      phone: e.target.value,
                    })
                  }
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="basics-summary"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Professional Summary
              </label>
              <textarea
                id="basics-summary"
                rows={4}
                value={summaryValue}
                onChange={(e) =>
                  handleChange("basics", {
                    ...resume.content.basics,
                    summary: e.target.value,
                  })
                }
                placeholder="Write a concise overview of your experience, core strengths, and impact..."
                className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </section>

        {/* Sortable Resume Sections */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedSections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {orderedSections.map((section) => (
                <SortableItem
                  key={section.id}
                  id={section.id}
                  section={section}
                  onAddItem={handleAddNewItem}
                  onDeleteSection={setDeletableSection}
                  onEdit={(type, content, sectionId) => {
                    setAddContent({ type, item: content, sectionId });
                  }}
                  onHide={handleToggleItemVisibility}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add Content Button kept inside scroll container */}
        <div className="pt-2 pb-4">
          <button
            type="button"
            onClick={() => setShowSectionModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Content</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen pt-16 bg-neutral-50 flex flex-col overflow-hidden print:!h-auto print:!pt-0 print:!bg-white print:!overflow-visible">
      {/* Full-Width Document Toolbar */}
      {editorToolbar}

      {/* Persistent Unsaved Changes Warning Banner when session expired and modal dismissed */}
      {isSessionExpired && reauthDismissed && (
        <div
          role="alert"
          data-testid="unsaved-changes-warning-banner"
          className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 shrink-0 print:hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-amber-900">
              <ExclamationTriangleIcon
                className="h-5 w-5 text-amber-600 shrink-0"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold">Unsaved changes:</strong> Your
                session has expired and background auto-save is paused. Sign in
                to save your work before leaving this page.
              </span>
            </div>
            <button
              type="button"
              data-testid="reopen-reauth-btn"
              onClick={handleReopenReauth}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-control text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 focus-ring transition-colors shrink-0"
            >
              Sign in to save
            </button>
          </div>
        </div>
      )}

      {/* Mobile View Switcher */}
      {!isDesktop && (
        <div className="flex justify-center gap-3 py-2 px-4 bg-white border-b border-gray-200 shrink-0 print:hidden">
          <button
            type="button"
            onClick={() => setActiveView("editor")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeView === "editor"
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-gray-600 hover:text-gray-900 hover:bg-neutral-100"
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveView("preview")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeView === "preview"
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-gray-600 hover:text-gray-900 hover:bg-neutral-100"
            }`}
          >
            Preview
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {isDesktop ? (
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={55} minSize={38} className="h-full">
              {editorPanelContent}
            </Panel>

            <PanelResizeHandle
              aria-label="Resize editor and preview panels"
              title="Drag to resize panels"
              data-testid="panel-resize-handle"
              className="w-2 bg-gray-200 hover:bg-blue-500 active:bg-blue-600 focus:outline-none focus-visible:bg-blue-500 transition-colors duration-150 flex items-center justify-center relative group cursor-col-resize"
            >
              <div className="h-8 w-1 rounded-full bg-gray-400/70 group-hover:opacity-0 transition-opacity" />
              <div className="absolute h-10 w-4 rounded-full bg-blue-600 shadow-md border border-blue-400 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center gap-0.5 pointer-events-none">
                <span className="w-0.5 h-4 bg-white/90 rounded-full" />
                <span className="w-0.5 h-4 bg-white/90 rounded-full" />
              </div>
            </PanelResizeHandle>

            <Panel defaultSize={45} minSize={30} className="h-full">
              <div className="h-full bg-neutral-100">
                <ResumePreview
                  resume={resume}
                  onChange={handlePreviewChange}
                />
              </div>
            </Panel>
          </PanelGroup>
        ) : activeView === "editor" ? (
          editorPanelContent
        ) : (
          <div className="h-full bg-neutral-100">
            <ResumePreview resume={resume} onChange={handlePreviewChange} />
          </div>
        )}
      </div>

      {/* Add Section Modal */}
      <AnimatePresence>
        {showSectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              role="dialog"
              aria-modal="true"
              aria-label="Add Content"
              className="bg-white border border-gray-200 rounded-xl w-full max-w-3xl mx-4 shadow-2xl transform transition-all text-gray-900"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Add Content
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSectionModal(false);
                      setSearchTerm("");
                    }}
                    aria-label="Close Add Content modal"
                    title="Close"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-neutral-100 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-5">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search sections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Sections Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredSections.map((section) => (
                    <button
                      type="button"
                      key={section.id}
                      onClick={() => handleAddSection(section)}
                      className="flex flex-col p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-sm transition-all text-left"
                    >
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {section.title}
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {section.description}
                      </p>
                    </button>
                  ))}

                  {/* Custom Section Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowSectionModal(false);
                      setSearchTerm("");
                      setShowCustomSectionModal(true);
                    }}
                    className="flex flex-col p-4 bg-neutral-50 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left"
                  >
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      Custom
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Create a custom section to combine different elements or
                      add something unique.
                    </p>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Section Modal */}
      <AnimatePresence>
        {showCustomSectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              role="dialog"
              aria-modal="true"
              aria-label="Create Custom Section"
              className="bg-white border border-gray-200 rounded-xl w-full max-w-md mx-4 shadow-2xl transform transition-all text-gray-900"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Create Custom Section
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowCustomSectionModal(false)}
                    aria-label="Close Custom Section modal"
                    title="Close"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-neutral-100 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="sectionTitle"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Section Title
                    </label>
                    <input
                      id="sectionTitle"
                      type="text"
                      value={customSectionTitle}
                      onChange={(e) => setCustomSectionTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter section title..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomSectionModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomSection}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Create Section
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addContent !== null && (
          <SectionEditors
            content={addContent}
            onClose={() => setAddContent(null)}
            onSave={handleAddContent}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletableSection && (
          <DialogBox
            title="Delete Section"
            onClose={() => setDeletableSection(null)}
            onSave={handleDeleteSection}
            id={deletableSection.id}
            className="max-w-full mx-auto"
            saveText="Delete"
          >
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                {deletableSection.title}
              </span>
              ? This action cannot be undone.
            </p>
          </DialogBox>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-white/75 backdrop-blur-sm z-50"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600" />
          </motion.div>
        )}
      </AnimatePresence>

      {effectiveResumeId && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          resumeId={effectiveResumeId}
          resumeTitle={resume.title}
          initialSharing={resume.sharing}
          onSharingUpdated={(sharing) =>
            setResume((prev) => ({ ...prev, sharing }))
          }
        />
      )}

      {!hasGlobalModal && (
        <ReauthModal
          isOpen={showLocalReauthModal}
          initialEmail={reauthEmail}
          onDismiss={() => setShowLocalReauthModal(false)}
        />
      )}
    </div>
  );
};

export default ResumeEditor;
