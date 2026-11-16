import axiosInstance from './axios';
import { IPortfolio } from '../types/portfolio';

class PortfolioService {
  async getPortfolios(): Promise<IPortfolio[]> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: IPortfolio[];
    }>('/api/portfolios');
    return response?.data?.data || [];
  }

  async getPortfolioById(id: string): Promise<IPortfolio> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: IPortfolio;
    }>(`/api/portfolios/${id}`);
    return response.data.data;
  }

  async createPortfolio(data: Partial<IPortfolio>): Promise<IPortfolio> {
    const response = await axiosInstance.post<{
      success: boolean;
      data: IPortfolio;
    }>('/api/portfolios', data);
    return response.data.data;
  }

  async updatePortfolio(id: string, data: Partial<IPortfolio>): Promise<IPortfolio> {
    const response = await axiosInstance.put<{
      success: boolean;
      data: IPortfolio;
    }>(`/api/portfolios/${id}`, data);
    return response.data.data;
  }

  async deletePortfolio(id: string): Promise<void> {
    await axiosInstance.delete(`/api/portfolios/${id}`);
  }

  async getPublicPortfolio(slug: string): Promise<IPortfolio> {
    const response = await axiosInstance.get<{
      success: boolean;
      data: IPortfolio;
    }>(`/api/portfolios/public/${slug}`);
    return response.data.data;
  }

  async uploadMedia(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post<{
      success: boolean;
      url: string;
      filename: string;
    }>('/api/portfolios/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      url: response.data.url,
      filename: response.data.filename
    };
  }
}

export const portfolioService = new PortfolioService();
