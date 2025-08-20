import { config } from './config.js';
import { logger } from './logger.js';
import { randomUUID } from 'crypto';

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance?: string;
    requestId?: string;
    [key: string]: any;
  };
  status: number;
}

export interface PaginatedResponse<T> {
  data?: T[];
  projects?: T[];
  documents?: T[];
  total: number;
  limit?: number;
  offset?: number;
  cursor?: string;
  nextCursor?: string;
}

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private token?: string;

  constructor() {
    this.baseUrl = config.API_BASE_URL;
    this.timeout = config.API_TIMEOUT;
    this.token = config.API_TOKEN;
  }

  private async request<T = any>(
    method: string,
    path: string,
    options: {
      body?: any;
      headers?: Record<string, string>;
      requestId?: string;
      idempotencyKey?: string;
    } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const requestId = options.requestId || randomUUID();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (options.idempotencyKey) {
      headers['X-Idempotency-Key'] = options.idempotencyKey;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (options.body && method !== 'GET') {
      requestOptions.body = JSON.stringify(options.body);
    }

    logger.debug({ 
      method, 
      url, 
      requestId, 
      idempotencyKey: options.idempotencyKey 
    }, 'API request');

    try {
      const response = await fetch(url, requestOptions);
      const responseText = await response.text();
      
      let data: any;
      try {
        data = responseText ? JSON.parse(responseText) : undefined;
      } catch (parseError) {
        logger.warn({ responseText, parseError }, 'Failed to parse response JSON');
        data = { rawResponse: responseText };
      }

      const result: ApiResponse<T> = {
        status: response.status,
      };

      if (response.ok) {
        result.data = data;
        logger.debug({ 
          requestId, 
          status: response.status, 
          dataKeys: data ? Object.keys(data) : [] 
        }, 'API response success');
      } else {
        result.error = data || {
          type: 'https://1plan.dev/errors/api-error',
          title: 'API Error',
          status: response.status,
          detail: `HTTP ${response.status}: ${response.statusText}`,
          requestId,
        };
        logger.warn({ 
          requestId, 
          status: response.status, 
          error: result.error 
        }, 'API response error');
      }

      return result;
    } catch (error) {
      logger.error({ requestId, error, method, url }, 'API request failed');
      
      return {
        status: 500,
        error: {
          type: 'https://1plan.dev/errors/network-error',
          title: 'Network Error',
          status: 500,
          detail: error instanceof Error ? error.message : 'Unknown network error',
          requestId,
        },
      };
    }
  }

  // Projects API
  async getProjects(options: { requestId?: string } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request('GET', '/projects', options);
  }

  async getProject(id: string, options: { requestId?: string } = {}): Promise<ApiResponse<any>> {
    return this.request('GET', `/projects/${id}`, options);
  }

  async createProject(data: any, options: { requestId?: string; idempotencyKey?: string } = {}): Promise<ApiResponse<any>> {
    return this.request('POST', '/projects', { ...options, body: data });
  }

  async updateProject(id: string, data: any, options: { requestId?: string } = {}): Promise<ApiResponse<any>> {
    return this.request('PATCH', `/projects/${id}`, { ...options, body: data });
  }

  async deleteProject(id: string, options: { requestId?: string } = {}): Promise<ApiResponse<void>> {
    return this.request('DELETE', `/projects/${id}`, options);
  }

  // Documents API
  async getDocuments(params: { 
    projectId?: string; 
    kind?: string; 
    limit?: number; 
    offset?: number; 
    sortBy?: string; 
    sortOrder?: string;
  } = {}, options: { requestId?: string } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    
    const query = searchParams.toString();
    const path = `/documents${query ? `?${query}` : ''}`;
    
    return this.request('GET', path, options);
  }

  async getDocument(id: string, options: { requestId?: string } = {}): Promise<ApiResponse<any>> {
    return this.request('GET', `/documents/${id}`, options);
  }

  async createDocument(data: any, options: { requestId?: string; idempotencyKey?: string } = {}): Promise<ApiResponse<any>> {
    return this.request('POST', '/documents', { ...options, body: data });
  }

  async updateDocument(id: string, data: any, options: { requestId?: string } = {}): Promise<ApiResponse<any>> {
    return this.request('PATCH', `/documents/${id}`, { ...options, body: data });
  }

  async deleteDocument(id: string, options: { requestId?: string } = {}): Promise<ApiResponse<void>> {
    return this.request('DELETE', `/documents/${id}`, options);
  }

  // Health check
  async healthCheck(options: { requestId?: string } = {}): Promise<ApiResponse<any>> {
    const url = this.baseUrl.replace('/api/v1', '/health/live');
    return this.request('GET', '', { ...options, headers: { 'X-Base-URL': url } });
  }
}

// Singleton instance
export const apiClient = new ApiClient();
