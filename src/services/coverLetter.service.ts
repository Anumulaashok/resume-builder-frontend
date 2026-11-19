import axiosInstance from './axios';
import { ICoverLetter } from '../types/coverLetter';

export function normalizeCoverLetterIdentifiers<T extends Partial<ICoverLetter>>(
  letter: T
): T {
  if (!letter || typeof letter !== 'object') {
    return letter;
  }
  const resolvedId = letter._id || letter.id;
  if (!resolvedId) {
    return letter;
  }
  return {
    ...letter,
    _id: letter._id || resolvedId,
    id: letter.id || resolvedId,
  };
}

function unwrapCoverLetterResponse(
  payload: { success?: boolean; data?: ICoverLetter } | ICoverLetter
): ICoverLetter {
  const record =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload.data as ICoverLetter)
      : (payload as ICoverLetter);
  return normalizeCoverLetterIdentifiers(record);
}

class CoverLetterService {
  async getCoverLetters(): Promise<ICoverLetter[]> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: ICoverLetter[];
    }>('/api/cover-letters');
    const items = response?.data?.data || [];
    return items.map((item) => normalizeCoverLetterIdentifiers(item));
  }

  async getCoverLetterById(id: string): Promise<ICoverLetter> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: ICoverLetter;
    }>(`/api/cover-letters/${id}`);
    return unwrapCoverLetterResponse(response.data);
  }

  async createCoverLetter(
    data: Partial<ICoverLetter>
  ): Promise<ICoverLetter> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: ICoverLetter;
    }>('/api/cover-letters', data);
    return unwrapCoverLetterResponse(response.data);
  }

  async updateCoverLetter(
    id: string,
    data: Partial<ICoverLetter>
  ): Promise<ICoverLetter> {
    const response = await axiosInstance.patch<{
      success: boolean;
      data: ICoverLetter;
    }>(`/api/cover-letters/${id}`, data);
    return unwrapCoverLetterResponse(response.data);
  }

  async deleteCoverLetter(id: string): Promise<void> {
    await axiosInstance.delete(`/api/cover-letters/${id}`);
  }

  async duplicateCoverLetter(id: string): Promise<ICoverLetter> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: ICoverLetter;
    }>(`/api/cover-letters/${id}/duplicate`);
    return unwrapCoverLetterResponse(response.data);
  }

  async generateCoverLetter(
    id: string,
    prompt?: string
  ): Promise<ICoverLetter> {
    const trimmedPrompt = prompt?.trim();
    const response = await axiosInstance.post<{
      success: boolean;
      data: ICoverLetter;
    }>(
      `/api/cover-letters/${id}/generate`,
      trimmedPrompt ? { prompt: trimmedPrompt } : {}
    );
    return unwrapCoverLetterResponse(response.data);
  }
}

export const coverLetterService = new CoverLetterService();
