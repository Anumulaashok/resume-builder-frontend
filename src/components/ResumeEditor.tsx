// React imports
import React, { useEffect, useState } from "react";

// UI Components
import {
  PencilIcon,
  DocumentDuplicateIcon,
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

// Notifications
import toast from "react-hot-toast";

// DnD related imports
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

// Layout Components
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

// Services
import { resumeService } from "../services/resume.service";

// Types
import {
  dateFields,
  EducationItem,
  IResume,
  ISection,
  SectionOption,
  SectionType,
} from "../types/resume";

// Custom Components
import ResumePreview from "./ResumePreview";
import SectionEditors from "./sections";
import { defaultResume } from "../constants/editorConstants";
import { EyeClosed, EyeClosedIcon, EyeIcon } from "lucide-react";

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

interface SortableItemProps {
  id: string;
  section: ISection;
  onRemove: (type: SectionType, id: string) => void;
  onEdit: (type: SectionType, item: any) => void;
  onHide: (type: SectionType, id: string) => void;
}

const ResumeEditor: React.FC<ResumeEditorProps> = ({
  initialResume,
  onSave,
  onBack,
}) => {
  const [resume, setResume] = useState<IResume>(initialResume || defaultResume);
  const [loading, setLoading] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomSectionModal, setShowCustomSectionModal] = useState(false);
  const [customSectionTitle, setCustomSectionTitle] = useState("");
  const [activeView, setActiveView] = useState<"editor" | "preview">("editor");
  const [filteredSections, setFilteredSections] = useState<SectionOption[]>();
  const [orderedSections, setOrderedSections] = useState<ISection[]>([]);
  const [addContent, setAddContent] = useState<{
    type: SectionType;
    item: any;
  } | null>(null);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      // Add custom touch sensor options for better mobile experience
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      // Customize pointer sensor for better touch handling
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ----------- handlers start -----------

  const handleChange = (section: string, value: any) => {
    setResume((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        [section]: value,
      },
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setResume((prev) => {
        const oldIndex = prev.content.sectionOrder.indexOf(
          active.id.toString()
        );
        const newIndex = prev.content.sectionOrder.indexOf(
          over?.id.toString() || ""
        );

        return {
          ...prev,
          content: {
            ...prev.content,
            sectionOrder: arrayMove(
              prev.content.sectionOrder,
              oldIndex,
              newIndex
            ),
          },
        };
      });
    }
  };

  const handleSectionPopup = (section: ISection | null) => {};

  const handleAddSection = (section: SectionOption) => {
    setShowSectionModal(false);
    const newSection: ISection = {
      id: `${section.id}-${Date.now()}`,
      type: section.type,
      title: section.title,
      content: [],
    };

    // Fix: Properly add the new section to both arrays
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
      title: customSectionTitle,
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

  const handleSave = async () => {
    setLoading(true);
    try {
      let savedResume;
      if (initialResume?._id) {
        savedResume = await resumeService.updateResume(
          initialResume._id,
          resume
        );
      } else {
        savedResume = await resumeService.createResume(resume);
      }
      toast.success("Resume saved successfully!");
      onSave?.(savedResume);
    } catch (error) {
      toast.error("Failed to save resume");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewItem = (section: ISection) => {
    let newItem: any = {
      id: `${section.id}-item-${Date.now()}`,
    };

    // Create appropriate item template based on section type
    switch (section.type) {
      case SectionType.EDUCATION:
        newItem = {
          ...newItem,
          institution: "",
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
          company: "",
          position: "",
          startDate: {} as dateFields,
          endDate: {} as dateFields,
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
          title: "",
          awarder: "",
          date: {} as dateFields,
          description: "",
        };
        break;

      case SectionType.ORGANIZATIONS:
        newItem = {
          ...newItem,
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

    setAddContent({ type: section.type, item: newItem });
  };

  const handleAddContent = (type: SectionType, item: any) => {
    const updatedSections = resume.content.sections.map((section) => {
      if (section.type === type) {
        const existingItemIndex = section.content.findIndex(
          (content) => content.id === item.id
        );

        if (existingItemIndex !== -1) {
          // Update existing item
          const updatedContent = [...section.content];
          updatedContent[existingItemIndex] = item;
          return {
            ...section,
            content: updatedContent,
          };
        } else {
          // Add new item
          return {
            ...section,
            content: [...(section.content || []), item],
          };
        }
      }
      return section;
    });

    setResume((prev) => {
      return {
        ...prev,
        content: {
          ...prev.content,
          sections: updatedSections,
        },
      };
    });

    setAddContent(null);
    toast.success("Content added successfully");
  };

  // ----------- handlers end -----------

  useEffect(() => {
    const selectedSectionTypes = resume.content.sections.map(
      (section) => section.type
    );

    const filteredSections = sectionOptions.filter(
      (section) =>
        !selectedSectionTypes.includes(section.type) ||
        section.type === SectionType.CUSTOM
    );

    const orderedSections = resume?.content?.sections
      ? resume.content.sectionOrder
          .map((id) =>
            resume.content.sections.find((section) => section.id === id)
          )
          .filter((section): section is ISection => section !== undefined)
      : [];
    setOrderedSections(orderedSections);
    setFilteredSections(filteredSections);
  }, [resume]);

  // Update SortableItem component to be more touch-friendly
  const SortableItem: React.FC<SortableItemProps> = ({
    id,
    section,
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

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 999 : undefined,
      position: isDragging ? "relative" : undefined,
      touchAction: "none", // Important for mobile drag
    };

    return (
      <div
        ref={setNodeRef}
        style={style as any}
        className={`bg-white rounded-lg shadow border border-gray-200 p-4 ${
          isDragging ? "opacity-75 shadow-lg" : ""
        }`}
        {...attributes}
        {...listeners}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => handleAddNewItem(section)}
              className="text-gray-400 hover:text-blue-500"
              aria-label={`Add item to ${section.title}`}
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* Display content items or empty state message */}
        <div className="space-y-2">
          {section.content && section.content.length > 0 ? (
            section.content.map((item: any) => (
              <div
                key={item.id}
                className="p-3 border border-gray-200 rounded-md hover:border-blue-300 transition-colors flex justify-between items-center"
              >
                {item.title ||
                  item.name ||
                  item.institution ||
                  item.company ||
                  "Untitled Item"}

                <div className="flex space-x-5 items-center">
                  <p onClick={() => onHide(section.type, item.id)}>
                    {item.enabled ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </p>
                  <PencilIcon
                    onClick={() => onEdit(section.type, item)}
                    className="h-5 w-5 hover:text-blue-500 cursor-pointer"
                    name="edit"
                  />
                  <XMarkIcon
                    onClick={() => onRemove(section.type, item.id)}
                    className="h-5 w-5 hover:text-red-500 cursor-pointer"
                    name="delete"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No items yet. Click the + button to add content.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="h-[calc(100vh-4rem)] bg-gray-50">
        {/* Mobile View Switcher */}
        <div className="lg:hidden flex justify-center space-x-4 py-2 bg-white border-b">
          <button
            onClick={() => setActiveView("editor")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === "editor"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveView("preview")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === "preview"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Preview
          </button>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden h-full">
          {activeView === "editor" ? (
            <div className="h-full overflow-auto px-4 py-6 bg-gray-50">
              <div className="bg-white shadow-xl rounded-lg overflow-hidden">
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={onBack}
                        className="inline-flex items-center px-2.5 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                        Back
                      </button>
                      <input
                        type="text"
                        value={resume.title}
                        onChange={(e) =>
                          setResume((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="text-xl sm:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full sm:w-auto"
                        placeholder="Resume Title"
                      />
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 sm:px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <PencilIcon className="h-4 w-4 mr-1.5" />
                        Save
                      </button>
                      <button className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 sm:px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <DocumentDuplicateIcon className="h-4 w-4 mr-1.5" />
                        Clone
                      </button>
                      <button className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 sm:px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
                        Export
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-6">
                  {/* Basic Information */}
                  <section>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={resume.content.basics.name}
                          onChange={(e) =>
                            handleChange("basics", {
                              ...resume.content.basics,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Professional Title
                        </label>
                        <input
                          type="text"
                          value={resume.content.basics.label}
                          onChange={(e) =>
                            handleChange("basics", {
                              ...resume.content.basics,
                              label: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={resume.content.basics.email}
                          onChange={(e) =>
                            handleChange("basics", {
                              ...resume.content.basics,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={resume.content.basics.phone}
                          onChange={(e) =>
                            handleChange("basics", {
                              ...resume.content.basics,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Professional Summary
                      </label>
                      <textarea
                        rows={4}
                        value={resume.content.basics.summary}
                        onChange={(e) =>
                          handleChange("basics", {
                            ...resume.content.basics,
                            summary: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </section>

                  {/* Resume Sections */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={resume.content.sectionOrder}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {orderedSections.map((section) => (
                          <SortableItem
                            key={section.id}
                            id={section.id}
                            section={section}
                            onEdit={(type, content) => {
                              setAddContent({ type, item: content });
                            }}
                            onHide={(type, id) => {
                              setResume((prev) => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  sections: prev.content.sections.map(
                                    (section) => {
                                      if (section.type === type) {
                                        return {
                                          ...section,
                                          content: section.content.map((item) =>
                                            item.id === id
                                              ? {
                                                  ...item,
                                                  enabled: !item.enabled,
                                                }
                                              : item
                                          ),
                                        };
                                      }
                                      return section;
                                    }
                                  ),
                                },
                              }));
                            }}
                            onRemove={(type, id) => {
                              setResume((prev) => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  sections: prev.content.sections.map(
                                    (section) => {
                                      if (section.type === type) {
                                        return {
                                          ...section,
                                          content: section.content.filter(
                                            (item) => item.id !== id
                                          ),
                                        };
                                      }
                                      return section;
                                    }
                                  ),
                                },
                              }));
                            }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Add Content Button */}
                  <div className="flex justify-center py-6">
                    <button
                      onClick={() => setShowSectionModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Add Content
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-gray-100">
              <ResumePreview resume={resume} />
            </div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block h-full">
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={55} minSize={40}>
              <div className="h-full overflow-auto px-4 sm:px-6 lg:px-8 py-6 bg-gray-50">
                <div className="bg-white shadow-xl rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={onBack}
                          className="inline-flex items-center px-2.5 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                          Back
                        </button>
                        <input
                          type="text"
                          value={resume.title}
                          onChange={(e) =>
                            setResume((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          className="text-xl sm:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full sm:w-auto"
                          placeholder="Resume Title"
                        />
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-4">
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 sm:px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <PencilIcon className="h-4 w-4 mr-1.5" />
                          Save
                        </button>
                        <button className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 sm:px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          <DocumentDuplicateIcon className="h-4 w-4 mr-1.5" />
                          Clone
                        </button>
                        <button className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 sm:px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
                          Export
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-6 space-y-6">
                    {/* Basic Information */}
                    <section>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={resume.content.basics.name}
                            onChange={(e) =>
                              handleChange("basics", {
                                ...resume.content.basics,
                                name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Professional Title
                          </label>
                          <input
                            type="text"
                            value={resume.content.basics.label}
                            onChange={(e) =>
                              handleChange("basics", {
                                ...resume.content.basics,
                                label: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={resume.content.basics.email}
                            onChange={(e) =>
                              handleChange("basics", {
                                ...resume.content.basics,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={resume.content.basics.phone}
                            onChange={(e) =>
                              handleChange("basics", {
                                ...resume.content.basics,
                                phone: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Professional Summary
                        </label>
                        <textarea
                          rows={4}
                          value={resume.content.basics.summary}
                          onChange={(e) =>
                            handleChange("basics", {
                              ...resume.content.basics,
                              summary: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </section>

                    {/* Resume Sections */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={resume.content.sectionOrder}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4">
                          {orderedSections.map((section) => (
                            <SortableItem
                              key={section.id}
                              id={section.id}
                              section={section}
                              onEdit={(type, content) => {
                                setAddContent({ type, item: content });
                              }}
                              onHide={(type, id) => {
                                setResume((prev) => ({
                                  ...prev,
                                  content: {
                                    ...prev.content,
                                    sections: prev.content.sections.map(
                                      (section) => {
                                        if (section.type === type) {
                                          return {
                                            ...section,
                                            content: section.content.map(
                                              (item) =>
                                                item.id === id
                                                  ? {
                                                      ...item,
                                                      enabled: !item.enabled,
                                                    }
                                                  : item
                                            ),
                                          };
                                        }
                                        return section;
                                      }
                                    ),
                                  },
                                }));
                              }}
                              onRemove={(type, id) => {
                                setResume((prev) => ({
                                  ...prev,
                                  content: {
                                    ...prev.content,
                                    sections: prev.content.sections.map(
                                      (section) => {
                                        if (section.type === type) {
                                          return {
                                            ...section,
                                            content: section.content.filter(
                                              (item) => item.id !== id
                                            ),
                                          };
                                        }
                                        return section;
                                      }
                                    ),
                                  },
                                }));
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {/* Add Content Button */}
                    <div className="flex justify-center py-6">
                      <button
                        onClick={() => setShowSectionModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PlusIcon className="h-5 w-5 mr-2 text-gray-400" />
                        Add Content
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-2 hover:w-3 bg-gray-200 transition-all duration-150 hover:bg-blue-100 flex items-center justify-center relative group">
              <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-blue-300 transition-colors absolute" />
              <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-blue-300 transition-colors absolute translate-x-0.5" />
            </PanelResizeHandle>

            <Panel defaultSize={45} minSize={30}>
              <div className="h-full bg-gray-100">
                <ResumePreview resume={resume} />
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>

      {/* Add Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-3xl mx-4 shadow-2xl transform transition-all">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add Content
                </h2>
                <button
                  onClick={() => setShowSectionModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Search Input */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search sections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Sections Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                {filteredSections?.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleAddSection(section)}
                    className="flex flex-col p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left"
                  >
                    <h3 className="text-base font-medium text-gray-900 mb-1">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {section.description}
                    </p>
                  </button>
                ))}

                {/* Custom Section Option */}
                <button
                  onClick={() => {
                    setShowSectionModal(false);
                    setShowCustomSectionModal(true);
                  }}
                  className="flex flex-col p-4 border border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left"
                >
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Custom
                  </h3>
                  <p className="text-sm text-gray-500">
                    Create a custom section to combine different elements or add
                    something unique.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Section Modal */}
      {showCustomSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-2xl transform transition-all">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Create Custom Section
                </h2>
                <button
                  onClick={() => setShowCustomSectionModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter section title..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCustomSectionModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCustomSection}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create Section
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {addContent !== null && (
        <SectionEditors
          content={addContent}
          onClose={() => setAddContent(null)}
          onSave={handleAddContent}
        />
      )}
    </div>
  );
};

export default ResumeEditor;
