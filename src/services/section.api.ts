// Section API service using the documented endpoints

import axiosInstance from "../services/axios";
import { ResumeSection, SectionItem } from "../types/resume";

export const sectionApi = {
    // Get all available section types
    async getSectionTypes(): Promise<{ id: string; title: string; description: string }[]> {
        const res = await axiosInstance.get("/api/sections/types");
        return res.data;
    },

    // Get all sections for a resume
    async getSections(resumeId: string): Promise<ResumeSection[]> {
        const res = await axiosInstance.get(`/api/resumes/${resumeId}/sections`);
        return res.data;
    },

    // Add a new section to a resume
    async addSection(resumeId: string, section: Partial<ResumeSection>): Promise<ResumeSection> {
        const res = await axiosInstance.post(`/api/sections/${resumeId}`, section);
        return res.data;
    },

    // Update an existing section
    async updateSection(resumeId: string, sectionId: string, section: Partial<ResumeSection>): Promise<ResumeSection> {
        const res = await axiosInstance.put(`/api/sections/${resumeId}/${sectionId}`, section);
        return res.data;
    },

    // Delete a section
    async deleteSection(resumeId: string, sectionId: string): Promise<void> {
        await axiosInstance.delete(`/api/sections/${resumeId}/${sectionId}`);
    },

    // Update section order
    async updateSectionOrder(resumeId: string, sectionOrder: string[]): Promise<void> {
        await axiosInstance.put(`/api/resumes/${resumeId}/sections/order`, { sectionOrder });
    },

    // Add item to section
    async addSectionItem(resumeId: string, sectionId: string, item: Partial<SectionItem>): Promise<SectionItem> {
        const res = await axiosInstance.post(`/api/sections/${resumeId}/${sectionId}/items`, item);
        return res.data;
    },

    // Update section item
    async updateSectionItem(resumeId: string, sectionId: string, itemId: string, item: Partial<SectionItem>): Promise<SectionItem> {
        const res = await axiosInstance.put(`/api/sections/${resumeId}/${sectionId}/items/${itemId}`, item);
        return res.data;
    },

    // Delete section item
    async deleteSectionItem(resumeId: string, sectionId: string, itemId: string): Promise<void> {
        await axiosInstance.delete(`/api/sections/${resumeId}/${sectionId}/items/${itemId}`);
    },

    // Toggle item status (enable/disable)
    async toggleSectionItemStatus(resumeId: string, sectionId: string, itemId: string, enabled: boolean): Promise<SectionItem> {
        const res = await axiosInstance.patch(`/api/sections/${resumeId}/${sectionId}/items/${itemId}/status`, { enabled });
        return res.data;
    }
};
