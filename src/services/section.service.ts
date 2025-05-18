import { v4 as uuidv4 } from 'uuid';
import {
    Resume,
    ResumeSection,
    SectionContentType,
    SectionItem,
} from '../types/resume';

// Section type definitions with default templates
export const sectionTypes = {
    education: {
        title: "Education",
        defaultItem: {
            id: '',
            institution: '',
            degree: '',
            field: '',
            startDate: '',
            endDate: '',
            location: '',
            description: '',
            enabled: true,
        }
    },
    work: {
        title: "Professional Experience",
        defaultItem: {
            id: '',
            company: '',
            position: '',
            startDate: '',
            endDate: '',
            location: '',
            description: '',
            achievements: [],
            isCurrent: false,
            enabled: true,
        }
    },
    skills: {
        title: "Skills",
        defaultItem: {
            id: '',
            name: '',
            level: 3,
            subSkills: [],
            enabled: true,
        }
    },
    languages: {
        title: "Languages",
        defaultItem: {
            id: '',
            language: '',
            proficiency: 'Professional Working',
            level: 3,
            enabled: true,
        }
    },
    certificates: {
        title: "Certificates",
        defaultItem: {
            id: '',
            name: '',
            issuer: '',
            issueDate: '',
            expirationDate: '',
            credentialID: '',
            credentialURL: '',
            enabled: true,
        }
    },
    interests: {
        title: "Interests",
        defaultItem: {
            id: '',
            name: '',
            description: '',
            enabled: true,
        }
    },
    projects: {
        title: "Projects",
        defaultItem: {
            id: '',
            name: '',
            description: '',
            startDate: '',
            endDate: '',
            url: '',
            technologies: [],
            achievements: [],
            enabled: true,
        }
    },
    courses: {
        title: "Courses",
        defaultItem: {
            id: '',
            name: '',
            institution: '',
            date: '',
            description: '',
            certificateURL: '',
            enabled: true,
        }
    },
    awards: {
        title: "Awards",
        defaultItem: {
            id: '',
            title: '',
            date: '',
            issuer: '',
            description: '',
            enabled: true,
        }
    },
    organizations: {
        title: "Organizations",
        defaultItem: {
            id: '',
            name: '',
            role: '',
            startDate: '',
            endDate: '',
            description: '',
            enabled: true,
        }
    },
    publications: {
        title: "Publications",
        defaultItem: {
            id: '',
            title: '',
            publisher: '',
            date: '',
            authors: [],
            url: '',
            description: '',
            enabled: true,
        }
    },
    references: {
        title: "References",
        defaultItem: {
            id: '',
            name: '',
            company: '',
            position: '',
            email: '',
            phone: '',
            reference: '',
            enabled: true,
        }
    },
    softSkills: {
        title: "Soft Skills",
        defaultItem: {
            id: '',
            name: '',
            level: 3,
            subSkills: [],
            enabled: true,
        }
    },
    achievements: {
        title: "Achievements",
        defaultItem: {
            id: '',
            title: '',
            date: '',
            description: '',
            enabled: true,
        }
    },
    technicalSkills: {
        title: "Technical Skills",
        defaultItem: {
            id: '',
            name: '',
            level: 3,
            subSkills: [],
            enabled: true,
        }
    },
    custom: {
        title: "Custom Section",
        defaultItem: {
            id: '',
            title: '',
            description: '',
            enabled: true,
        }
    }
};

class SectionService {
    // Get all available section types
    getAllSectionTypes(): { id: string; title: string; description: string }[] {
        return Object.entries(sectionTypes).map(([id, section]) => ({
            id,
            title: section.title,
            description: '',
        }));
    }

    // Create a new section and add it to the resume
    createSection(resume: Resume, sectionType: keyof typeof sectionTypes, title?: string): Resume {
        if (!sectionTypes[sectionType]) {
            throw new Error(`Invalid section type: ${sectionType}`);
        }

        const sectionId = `${sectionType}-${Date.now()}`;
        const newSection: ResumeSection = {
            id: sectionId,
            type: sectionType,
            title: title || sectionTypes[sectionType].title,
            content: [],
            enabled: true,
            isCustom: sectionType === 'custom',
        };

        return {
            ...resume,
            content: {
                ...resume.content,
                sections: [...resume.content.sections, newSection],
                sectionOrder: [...resume.content.sectionOrder, sectionId],
            },
        };
    }

    // Add an item to a specific section
    addItemToSection(resume: Resume, sectionId: string): Resume {
        const sectionIndex = resume.content.sections.findIndex(
            (section) => section.id === sectionId
        );

        if (sectionIndex === -1) {
            throw new Error(`Section not found: ${sectionId}`);
        }

        const section = resume.content.sections[sectionIndex];
        const sectionType = section.type as keyof typeof sectionTypes;

        if (!sectionTypes[sectionType]) {
            throw new Error(`Invalid section type: ${sectionType}`);
        }

        // Create a new item based on the section type's default item
        const newItem = {
            ...sectionTypes[sectionType].defaultItem,
            id: uuidv4(),
        };

        const updatedSections = [...resume.content.sections];
        updatedSections[sectionIndex] = {
            ...section,
            content: [...section.content, newItem],
        };

        return {
            ...resume,
            content: {
                ...resume.content,
                sections: updatedSections,
            },
        };
    }

    // Update a section item
    updateSectionItem(
        resume: Resume,
        sectionId: string,
        itemId: string,
        updatedItem: any
    ): Resume {
        const sectionIndex = resume.content.sections.findIndex(
            (section) => section.id === sectionId
        );

        if (sectionIndex === -1) {
            throw new Error(`Section not found: ${sectionId}`);
        }

        const section = resume.content.sections[sectionIndex];
        const itemIndex = section.content.findIndex((item) => item.id === itemId);

        if (itemIndex === -1) {
            throw new Error(`Item not found: ${itemId}`);
        }

        const updatedContent = [...section.content];
        updatedContent[itemIndex] = {
            ...updatedContent[itemIndex],
            ...updatedItem,
        };

        const updatedSections = [...resume.content.sections];
        updatedSections[sectionIndex] = {
            ...section,
            content: updatedContent,
        };

        return {
            ...resume,
            content: {
                ...resume.content,
                sections: updatedSections,
            },
        };
    }

    // Toggle section item enabled state
    toggleSectionItemEnabled(
        resume: Resume,
        sectionId: string,
        itemId: string
    ): Resume {
        const sectionIndex = resume.content.sections.findIndex(
            (section) => section.id === sectionId
        );

        if (sectionIndex === -1) {
            throw new Error(`Section not found: ${sectionId}`);
        }

        const section = resume.content.sections[sectionIndex];
        const itemIndex = section.content.findIndex((item) => item.id === itemId);

        if (itemIndex === -1) {
            throw new Error(`Item not found: ${itemId}`);
        }

        const item = section.content[itemIndex];
        const updatedItem = {
            ...item,
            enabled: item.enabled === undefined ? false : !item.enabled,
        };

        return this.updateSectionItem(resume, sectionId, itemId, updatedItem);
    }

    // Delete a section item
    deleteSectionItem(resume: Resume, sectionId: string, itemId: string): Resume {
        const sectionIndex = resume.content.sections.findIndex(
            (section) => section.id === sectionId
        );

        if (sectionIndex === -1) {
            throw new Error(`Section not found: ${sectionId}`);
        }

        const section = resume.content.sections[sectionIndex];
        const filteredContent = section.content.filter(
            (item) => item.id !== itemId
        );

        const updatedSections = [...resume.content.sections];
        updatedSections[sectionIndex] = {
            ...section,
            content: filteredContent,
        };

        return {
            ...resume,
            content: {
                ...resume.content,
                sections: updatedSections,
            },
        };
    }

    // Delete an entire section
    deleteSection(resume: Resume, sectionId: string): Resume {
        const filteredSections = resume.content.sections.filter(
            (section) => section.id !== sectionId
        );
        const filteredSectionOrder = resume.content.sectionOrder.filter(
            (id) => id !== sectionId
        );

        return {
            ...resume,
            content: {
                ...resume.content,
                sections: filteredSections,
                sectionOrder: filteredSectionOrder,
            },
        };
    }

    // Toggle section visibility
    toggleSectionEnabled(resume: Resume, sectionId: string): Resume {
        const sectionIndex = resume.content.sections.findIndex(
            (section) => section.id === sectionId
        );

        if (sectionIndex === -1) {
            throw new Error(`Section not found: ${sectionId}`);
        }

        const section = resume.content.sections[sectionIndex];
        const updatedSection = {
            ...section,
            enabled: section.enabled === undefined ? false : !section.enabled,
        };

        const updatedSections = [...resume.content.sections];
        updatedSections[sectionIndex] = updatedSection;

        return {
            ...resume,
            content: {
                ...resume.content,
                sections: updatedSections,
            },
        };
    }

    // Reorder sections based on updated sectionOrder
    reorderSections(resume: Resume, newSectionOrder: string[]): Resume {
        // Validate that newSectionOrder contains all section IDs
        const currentSectionIds = new Set(resume.content.sectionOrder);
        const newSectionIds = new Set(newSectionOrder);

        if (currentSectionIds.size !== newSectionIds.size) {
            throw new Error('New section order must contain all existing section IDs');
        }

        Array.from(currentSectionIds).forEach(id => {
            if (!newSectionIds.has(id)) {
                throw new Error(`Section ID not found in new order: ${id}`);
            }
        });

        return {
            ...resume,
            content: {
                ...resume.content,
                sectionOrder: newSectionOrder,
            },
        };
    }

    // Reorder items within a section
    reorderSectionItems(
        resume: Resume,
        sectionId: string,
        newItemOrder: string[]
    ): Resume {
        const sectionIndex = resume.content.sections.findIndex(
            (section) => section.id === sectionId
        );

        if (sectionIndex === -1) {
            throw new Error(`Section not found: ${sectionId}`);
        }

        const section = resume.content.sections[sectionIndex];

        // Map of items by ID for quick lookup
        const itemsMap = new Map(
            section.content.map((item) => [item.id, item])
        );

        // Create a new content array based on the new order
        const reorderedContent = newItemOrder.map((itemId) => {
            const item = itemsMap.get(itemId);
            if (!item) {
                throw new Error(`Item not found: ${itemId}`);
            }
            return item;
        });

        const updatedSections = [...resume.content.sections];
        updatedSections[sectionIndex] = {
            ...section,
            content: reorderedContent,
        };

        return {
            ...resume,
            content: {
                ...resume.content,
                sections: updatedSections,
            },
        };
    }

    // Validate a section's structure based on its type
    validateSection(section: ResumeSection): boolean {
        const sectionType = section.type as keyof typeof sectionTypes;

        if (!sectionTypes[sectionType]) {
            return false;
        }

        // For custom sections, we don't do strict validation
        if (sectionType === 'custom') {
            return true;
        }

        // Check that all items in content have the required properties
        const defaultItem = sectionTypes[sectionType].defaultItem;
        const requiredProps = Object.keys(defaultItem).filter(key =>
            key !== 'id' && key !== 'enabled'
        );

        return section.content.every(item => {
            if (!item.id) return false;

            // Check if all required properties exist (even if they're empty)
            return requiredProps.every(prop => prop in item);
        });
    }
}

export const sectionService = new SectionService();
