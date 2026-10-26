import type {
  Client,
  ClientInput,
  Project,
  ProjectInput,
  Conversation,
  ConversationInput,
  Message,
  MessageInput,
  SystemStats,
  HealthCheckResponse,
  FollowUp,
  EmployeeDashboardStats,
  ConversationAnalysis,
  GeneratedFollowUp,
  ProjectShareLink,
  PortalProjectResponse,
  PortalMessageItem,
  Contact,
  ContactInput,
  EmailMessage,
  EmailSendRequest,
  EmailDraftRequest,
  EmailDraftResponse,
  EmailFilterParams,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PREFIX = '/api/v1';
const EMPLOYEE_KEY = import.meta.env.VITE_EMPLOYEE_KEY || 'cp_employee_secret_key_2026';

function authHeaders(isPortal = false, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  // Only attach employee authorization credentials for internal employee endpoints
  if (!isPortal) {
    headers['X-Employee-Key'] = EMPLOYEE_KEY;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData.detail) {
        errorMsg = typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail);
      }
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorMsg);
  }
  if (res.status === 204) {
    return null as T;
  }
  return res.json();
}

export const api = {
  // Health & System (Public)
  async getHealth(): Promise<HealthCheckResponse> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<HealthCheckResponse>(res);
  },

  async getStats(): Promise<SystemStats> {
    const res = await fetch(`${API_BASE}${PREFIX}/stats`, {
      headers: authHeaders(false),
    });
    return handleResponse<SystemStats>(res);
  },

  async seedDemo(force = false): Promise<any> {
    const res = await fetch(`${API_BASE}${PREFIX}/seed?force=${force}`, {
      method: 'POST',
      headers: authHeaders(false),
    });
    return handleResponse(res);
  },

  // Employee Dashboard & Follow-ups (Employee Only)
  async getEmployeeDashboardStats(): Promise<EmployeeDashboardStats> {
    const res = await fetch(`${API_BASE}${PREFIX}/followups/dashboard`, {
      headers: authHeaders(false),
    });
    return handleResponse<EmployeeDashboardStats>(res);
  },

  async getFollowups(params?: {
    status?: string;
    client_id?: number;
    project_id?: number;
    active_only?: boolean;
  }): Promise<FollowUp[]> {
    const url = new URL(`${API_BASE}${PREFIX}/followups`);
    if (params?.status) {
      url.searchParams.append('status', params.status);
    }
    if (params?.client_id !== undefined) {
      url.searchParams.append('client_id', String(params.client_id));
    }
    if (params?.project_id !== undefined) {
      url.searchParams.append('project_id', String(params.project_id));
    }
    if (params?.active_only !== undefined) {
      url.searchParams.append('active_only', String(params.active_only));
    }
    const res = await fetch(url.toString(), {
      headers: authHeaders(false),
    });
    return handleResponse<FollowUp[]>(res);
  },

  async snoozeFollowup(id: number, days = 1.0): Promise<FollowUp> {
    const res = await fetch(`${API_BASE}${PREFIX}/followups/${id}/snooze`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify({ days }),
    });
    return handleResponse<FollowUp>(res);
  },

  async completeFollowup(id: number): Promise<FollowUp> {
    const res = await fetch(`${API_BASE}${PREFIX}/followups/${id}/complete`, {
      method: 'POST',
      headers: authHeaders(false),
    });
    return handleResponse<FollowUp>(res);
  },

  async escalateFollowup(id: number, reason?: string): Promise<FollowUp> {
    const res = await fetch(`${API_BASE}${PREFIX}/followups/${id}/escalate`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify({ reason }),
    });
    return handleResponse<FollowUp>(res);
  },

  // Gemini AI Service (Employee Only)
  async analyzeConversation(conversationId: number): Promise<ConversationAnalysis> {
    const res = await fetch(`${API_BASE}${PREFIX}/ai/conversations/${conversationId}/analyze`, {
      method: 'POST',
      headers: authHeaders(false),
    });
    return handleResponse<ConversationAnalysis>(res);
  },

  async generateFollowUp(
    conversationId: number,
    options?: { tone?: string; instructions?: string }
  ): Promise<GeneratedFollowUp> {
    const res = await fetch(`${API_BASE}${PREFIX}/ai/conversations/${conversationId}/generate-followup`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify(options || {}),
    });
    return handleResponse<GeneratedFollowUp>(res);
  },

  async markGeneratedAsSent(
    conversationId: number,
    data: { content: string; sender_name?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}${PREFIX}/ai/conversations/${conversationId}/send-generated`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Clients (Employee Only)
  async getClients(params?: { is_archived?: boolean; search?: string }): Promise<Client[]> {
    const url = new URL(`${API_BASE}${PREFIX}/clients`);
    if (params?.is_archived !== undefined) {
      url.searchParams.append('is_archived', String(params.is_archived));
    }
    if (params?.search) {
      url.searchParams.append('search', params.search);
    }
    const res = await fetch(url.toString(), {
      headers: authHeaders(false),
    });
    return handleResponse<Client[]>(res);
  },

  async getClient(id: number): Promise<Client> {
    const res = await fetch(`${API_BASE}${PREFIX}/clients/${id}`, {
      headers: authHeaders(false),
    });
    return handleResponse<Client>(res);
  },

  async createClient(data: ClientInput): Promise<Client> {
    const res = await fetch(`${API_BASE}${PREFIX}/clients`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse<Client>(res);
  },

  async updateClient(id: number, data: Partial<ClientInput>): Promise<Client> {
    const res = await fetch(`${API_BASE}${PREFIX}/clients/${id}`, {
      method: 'PUT',
      headers: authHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse<Client>(res);
  },

  async archiveClient(id: number): Promise<Client> {
    const res = await fetch(`${API_BASE}${PREFIX}/clients/${id}/archive`, {
      method: 'PATCH',
      headers: authHeaders(false),
    });
    return handleResponse<Client>(res);
  },

  async unarchiveClient(id: number): Promise<Client> {
    const res = await fetch(`${API_BASE}${PREFIX}/clients/${id}/unarchive`, {
      method: 'PATCH',
      headers: authHeaders(false),
    });
    return handleResponse<Client>(res);
  },

  async deleteClient(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}${PREFIX}/clients/${id}`, {
      method: 'DELETE',
      headers: authHeaders(false),
    });
    return handleResponse<void>(res);
  },

  // Contacts (Employee Only)
  async getContacts(params?: {
    client_id?: number;
    project_id?: number;
    preferred_channel?: string;
    consent_status?: string;
    search?: string;
  }): Promise<Contact[]> {
    const url = new URL(`${API_BASE}${PREFIX}/contacts`);
    if (params?.client_id !== undefined) {
      url.searchParams.append('client_id', String(params.client_id));
    }
    if (params?.project_id !== undefined) {
      url.searchParams.append('project_id', String(params.project_id));
    }
    if (params?.preferred_channel) {
      url.searchParams.append('preferred_channel', params.preferred_channel);
    }
    if (params?.consent_status) {
      url.searchParams.append('consent_status', params.consent_status);
    }
    if (params?.search) {
      url.searchParams.append('search', params.search);
    }
    const res = await fetch(url.toString(), {
      headers: authHeaders(false),
    });
    return handleResponse<Contact[]>(res);
  },

  async getContact(id: number): Promise<Contact> {
    const res = await fetch(`${API_BASE}${PREFIX}/contacts/${id}`, {
      headers: authHeaders(false),
    });
    return handleResponse<Contact>(res);
  },

  async createContact(data: ContactInput): Promise<Contact> {
    const res = await fetch(`${API_BASE}${PREFIX}/contacts`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse<Contact>(res);
  },

  async updateContact(id: number, data: Partial<ContactInput>): Promise<Contact> {
    const res = await fetch(`${API_BASE}${PREFIX}/contacts/${id}`, {
      method: 'PUT',
      headers: authHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse<Contact>(res);
  },

  async deleteContact(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}${PREFIX}/contacts/${id}`, {
      method: 'DELETE',
      headers: authHeaders(false),
    });
    return handleResponse<void>(res);
  },

  // Projects (Employee Only)
  async getProjects(params?: { client_id?: number; search?: string }): Promise<Project[]> {
    const url = new URL(`${API_BASE}${PREFIX}/projects`);
    if (params?.client_id !== undefined) {
      url.searchParams.append('client_id', String(params.client_id));
    }
    if (params?.search) {
      url.searchParams.append('search', params.search);
    }
    const res = await fetch(url.toString(), {
      headers: authHeaders(false),
    });
    return handleResponse<Project[]>(res);
  },

  async getProject(id: number): Promise<Project> {
    const res = await fetch(`${API_BASE}${PREFIX}/projects/${id}`, {
      headers: authHeaders(false),
    });
    return handleResponse<Project>(res);
  },

  async createProject(data: ProjectInput): Promise<Project> {
    const res = await fetch(`${API_BASE}${PREFIX}/projects`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse<Project>(res);
  },

  async updateProject(id: number, data: Partial<ProjectInput>): Promise<Project> {
    const res = await fetch(`${API_BASE}${PREFIX}/projects/${id}`, {
      method: 'PUT',
      headers: authHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse<Project>(res);
  },

  async deleteProject(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}${PREFIX}/projects/${id}`, {
      method: 'DELETE',
      headers: authHeaders(false),
    });
    return handleResponse<void>(res);
  },

  // Project Communication Share Links (Employee Only)
  async getProjectShareLink(projectId: number): Promise<ProjectShareLink | null> {
    const res = await fetch(`${API_BASE}${PREFIX}/projects/${projectId}/share-link`, {
      headers: authHeaders(false),
    });
    return handleResponse<ProjectShareLink | null>(res);
  },

  async generateProjectShareLink(projectId: number): Promise<ProjectShareLink> {
    const res = await fetch(`${API_BASE}${PREFIX}/projects/${projectId}/share-link`, {
      method: 'POST',
      headers: authHeaders(false),
    });
    return handleResponse<ProjectShareLink>(res);
  },

  async revokeProjectShareLink(projectId: number): Promise<{ success: boolean; message: string; project_id: number; revoked_at: string }> {
    const res = await fetch(`${API_BASE}${PREFIX}/projects/${projectId}/share-link/revoke`, {
      method: 'POST',
      headers: authHeaders(false),
    });
    return handleResponse(res);
  },

  // Conversations (Employee Only)
  async getConversations(params?: { client_id?: number; project_id?: number }): Promise<Conversation[]> {
    const url = new URL(`${API_BASE}${PREFIX}/conversations`);
    if (params?.client_id !== undefined) {
      url.searchParams.append('client_id', String(params.client_id));
    }
    if (params?.project_id !== undefined) {
      url.searchParams.append('project_id', String(params.project_id));
    }
    const res = await fetch(url.toString(), {
      headers: authHeaders(false),
    });
    return handleResponse<Conversation[]>(res);
  },

  async getConversation(id: number): Promise<Conversation> {
    const res = await fetch(`${API_BASE}${PREFIX}/conversations/${id}`, {
      headers: authHeaders(false),
    });
    return handleResponse<Conversation>(res);
  },

  async createConversation(data: ConversationInput): Promise<Conversation> {
    const res = await fetch(`${API_BASE}${PREFIX}/conversations`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse<Conversation>(res);
  },

  // Messages (Employee Only)
  async sendMessage(conversationId: number, data: MessageInput): Promise<Message> {
    const res = await fetch(`${API_BASE}${PREFIX}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse<Message>(res);
  },

  // =========================================================================
  // Public Client Portal API (Token Authenticated - No Employee Key Required)
  // =========================================================================
  async getPortalProject(token: string): Promise<PortalProjectResponse> {
    const res = await fetch(`${API_BASE}${PREFIX}/portal/${encodeURIComponent(token)}`, {
      headers: authHeaders(true),
    });
    return handleResponse<PortalProjectResponse>(res);
  },

  async postPortalMessage(
    token: string,
    payload: { content: string; conversation_id?: number; sender_name?: string }
  ): Promise<PortalMessageItem> {
    const res = await fetch(`${API_BASE}${PREFIX}/portal/${encodeURIComponent(token)}/messages`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    return handleResponse<PortalMessageItem>(res);
  },

  // =========================================================================
  // Email System API (Protected Employee Endpoints)
  // =========================================================================
  async getEmails(params?: EmailFilterParams): Promise<EmailMessage[]> {
    const url = new URL(`${API_BASE}${PREFIX}/emails`);
    if (params?.contact_id !== undefined) {
      url.searchParams.append('contact_id', String(params.contact_id));
    }
    if (params?.client_id !== undefined) {
      url.searchParams.append('client_id', String(params.client_id));
    }
    if (params?.project_id !== undefined) {
      url.searchParams.append('project_id', String(params.project_id));
    }
    if (params?.status) {
      url.searchParams.append('status', params.status);
    }
    if (params?.direction) {
      url.searchParams.append('direction', params.direction);
    }
    if (params?.search) {
      url.searchParams.append('search', params.search);
    }
    if (params?.limit !== undefined) {
      url.searchParams.append('limit', String(params.limit));
    }
    if (params?.offset !== undefined) {
      url.searchParams.append('offset', String(params.offset));
    }
    const res = await fetch(url.toString(), {
      headers: authHeaders(false),
    });
    return handleResponse<EmailMessage[]>(res);
  },

  async getEmail(id: number): Promise<EmailMessage> {
    const res = await fetch(`${API_BASE}${PREFIX}/emails/${id}`, {
      headers: authHeaders(false),
    });
    return handleResponse<EmailMessage>(res);
  },

  async sendEmail(payload: EmailSendRequest): Promise<EmailMessage> {
    const res = await fetch(`${API_BASE}${PREFIX}/emails/send`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify(payload),
    });
    return handleResponse<EmailMessage>(res);
  },

  async generateEmailDraft(payload: EmailDraftRequest): Promise<EmailDraftResponse> {
    const res = await fetch(`${API_BASE}${PREFIX}/emails/draft`, {
      method: 'POST',
      headers: authHeaders(false),
      body: JSON.stringify(payload),
    });
    return handleResponse<EmailDraftResponse>(res);
  },

  async simulateInboundWebhook(payload: {
    from_email: string;
    to_email?: string;
    subject?: string;
    text: string;
    html?: string;
    provider_message_id?: string;
    in_reply_to?: string;
  }): Promise<any> {
    const webhookSecret = import.meta.env.VITE_EMAIL_WEBHOOK_SECRET || 'cp_webhook_secret_key_2026';
    const res = await fetch(`${API_BASE}${PREFIX}/emails/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
};
