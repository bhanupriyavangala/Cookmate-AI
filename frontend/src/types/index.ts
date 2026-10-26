export type NavItemKey = 'dashboard' | 'clients' | 'contacts' | 'projects' | 'messages' | 'settings';

export interface NavItem {
  key: NavItemKey;
  label: string;
  badge?: string;
  badgeType?: 'phase' | 'beta' | 'new';
  disabled?: boolean;
}

export interface DatabaseStatus {
  status: 'connected' | 'disconnected' | 'error';
  dialect?: string;
  engine?: string;
  url?: string;
  error?: string | null;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'error';
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  database: DatabaseStatus;
}

export interface SystemStats {
  total_clients: number;
  active_clients: number;
  archived_clients: number;
  total_projects: number;
  active_conversations: number;
  total_messages: number;
}

export interface FollowUpThresholds {
  recommended_due_days: number;
  overdue_days: number;
  escalation_days: number;
}

export interface EmployeeDashboardStats {
  total_clients: number;
  total_projects: number;
  pending_responses: number;
  followups_due: number;
  overdue_items: number;
  escalated_items: number;
  snoozed_items: number;
  thresholds: FollowUpThresholds;
}

export interface FollowUp {
  id: number;
  conversation_id: number;
  conversation_subject?: string | null;
  channel?: string | null;
  client_id: number;
  client_name?: string | null;
  client_company?: string | null;
  project_id?: number | null;
  project_title?: string | null;
  status: 'pending' | 'due' | 'overdue' | 'escalated' | 'snoozed' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  days_waiting: number;
  last_client_message_at?: string | null;
  last_message_content?: string | null;
  snoozed_until?: string | null;
  is_escalated: boolean;
  escalation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  status: 'active' | 'inactive' | 'archived';
  is_archived: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  projects_count?: number;
  conversations_count?: number;
}

export interface ClientInput {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  status?: string;
  notes?: string;
}

export interface Project {
  id: number;
  client_id: number;
  client_name?: string | null;
  title: string;
  description?: string | null;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  budget?: number | null;
  deadline?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  client_id: number;
  title: string;
  description?: string;
  status?: string;
  budget?: number;
  deadline?: string;
}

export interface Contact {
  id: number;
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  preferred_channel: 'email' | 'whatsapp' | 'phone' | 'portal';
  consent_status: 'opted_in' | 'pending' | 'opted_out';
  notes?: string | null;
  client_id?: number | null;
  client_name?: string | null;
  project_id?: number | null;
  project_title?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactInput {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  preferred_channel?: 'email' | 'whatsapp' | 'phone' | 'portal';
  consent_status?: 'opted_in' | 'pending' | 'opted_out';
  notes?: string;
  client_id?: number | null;
  project_id?: number | null;
  is_primary?: boolean;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_type: 'client' | 'team' | 'system';
  sender_name: string;
  content: string;
  sent_at: string;
  created_at: string;
}

export interface MessageInput {
  sender_type: 'client' | 'team' | 'system';
  sender_name: string;
  content: string;
}

export interface Conversation {
  id: number;
  client_id: number;
  client_name?: string | null;
  project_id?: number | null;
  project_title?: string | null;
  subject: string;
  channel: string;
  status: 'open' | 'closed' | 'pending';
  messages_count?: number;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface ConversationInput {
  client_id: number;
  project_id?: number | null;
  subject: string;
  channel?: string;
  status?: string;
  initial_message?: string;
}

export interface ConversationAnalysis {
  conversation_id: number;
  pending_action: string;
  who_needs_to_respond: 'team' | 'client' | 'none';
  response_required: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  possible_project_impact: string;
  recommended_next_action: string;
  ai_source: string;
  analysis_timestamp: string;
}

export interface GeneratedFollowUp {
  conversation_id: number;
  subject: string;
  message: string;
  tone: string;
  ai_source: string;
  confidence_score?: number;
}

export interface ProjectShareLink {
  id: number;
  project_id: number;
  token: string;
  is_active: boolean;
  created_at: string;
  revoked_at?: string | null;
  last_accessed_at?: string | null;
  share_url?: string;
}

export interface PortalMessageItem {
  id: number;
  sender_type: 'client' | 'team';
  sender_name: string;
  content: string;
  sent_at: string;
}

export interface PortalConversationItem {
  id: number;
  subject: string;
  channel: string;
  status: string;
  updated_at: string;
  messages: PortalMessageItem[];
}

export interface PortalProjectResponse {
  project_id: number;
  project_title: string;
  project_description?: string | null;
  client_name: string;
  client_company?: string | null;
  token: string;
  is_active: boolean;
  conversations: PortalConversationItem[];
}

export type EmailStatus = 'sent' | 'failed' | 'received' | 'queued';
export type EmailDirection = 'outbound' | 'inbound';
export type EmailDraftTone = 'professional' | 'friendly' | 'urgent' | 'concise';

export interface EmailMessage {
  id: number;
  contact_id?: number | null;
  client_id?: number | null;
  project_id?: number | null;
  recipient_email: string;
  recipient_name?: string | null;
  sender_email: string;
  subject: string;
  body_text: string;
  body_html?: string | null;
  status: EmailStatus;
  direction: EmailDirection;
  provider: string;
  provider_message_id?: string | null;
  idempotency_key?: string | null;
  error_details?: string | null;
  ai_drafted: boolean;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string | null;
  client_name?: string | null;
  project_title?: string | null;
}

export interface EmailSendRequest {
  recipient_email: string;
  recipient_name?: string | null;
  contact_id?: number | null;
  client_id?: number | null;
  project_id?: number | null;
  subject: string;
  body_text: string;
  body_html?: string | null;
  idempotency_key?: string | null;
  ai_drafted?: boolean;
  force_send?: boolean;
}

export interface EmailDraftRequest {
  contact_id: number;
  project_id?: number | null;
  tone?: EmailDraftTone;
  instructions?: string | null;
}

export interface EmailDraftResponse {
  subject: string;
  body_text: string;
  tone: string;
  ai_source: string;
}

export interface EmailFilterParams {
  contact_id?: number;
  client_id?: number;
  project_id?: number;
  status?: string;
  direction?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

