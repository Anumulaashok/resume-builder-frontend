import axiosInstance from './axios';
import {
  ApplicationReorderMove,
  ApplicationStatus,
  IJobApplication,
  UpsertApplicationPayload,
} from '../types/application';

export function normalizeApplication(raw: Partial<IJobApplication> & { _id?: string; id?: string }): IJobApplication {
  const resolvedId = raw.id || raw._id || '';
  return {
    id: resolvedId,
    _id: raw._id || resolvedId,
    userId: raw.userId,
    company: raw.company || '',
    role: raw.role || '',
    location: raw.location || '',
    url: raw.url || '',
    status: raw.status || 'wishlist',
    order: typeof raw.order === 'number' ? raw.order : 0,
    appliedAt: raw.appliedAt ?? null,
    salary: raw.salary || '',
    notes: raw.notes || '',
    resumeId: raw.resumeId ?? null,
    coverLetterId: raw.coverLetterId ?? null,
    jobDescription: raw.jobDescription || '',
    contacts: Array.isArray(raw.contacts)
      ? raw.contacts.map((c) => ({
          name: c?.name || '',
          email: c?.email || '',
          role: c?.role || '',
        }))
      : [],
    nextActionAt: raw.nextActionAt ?? null,
    nextActionNote: raw.nextActionNote || '',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

class ApplicationService {
  async getApplications(status?: ApplicationStatus): Promise<IJobApplication[]> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: IJobApplication[];
    }>('/api/applications', {
      params: status ? { status } : undefined,
    });
    const list = response?.data?.data || [];
    return list.map((item) => normalizeApplication(item));
  }

  async createApplication(payload: UpsertApplicationPayload): Promise<IJobApplication> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: IJobApplication;
    }>('/api/applications', payload);
    return normalizeApplication(response.data.data);
  }

  async updateApplication(
    id: string,
    payload: Partial<UpsertApplicationPayload>
  ): Promise<IJobApplication> {
    const response = await axiosInstance.patch<{
      success: boolean;
      data: IJobApplication;
    }>(`/api/applications/${id}`, payload);
    return normalizeApplication(response.data.data);
  }

  async deleteApplication(id: string): Promise<void> {
    await axiosInstance.delete(`/api/applications/${id}`);
  }

  async reorderApplications(moves: ApplicationReorderMove[]): Promise<void> {
    await axiosInstance.patch('/api/applications/reorder', { moves });
  }
}

export const applicationService = new ApplicationService();
