export type UserRole = "employee" | "support" | "admin"

export type TicketPriority = "low" | "medium" | "high" | "critical"

export type TicketStatus = "open" | "in_progress" | "waiting_response" | "resolved" | "closed"

export type TicketCategory = "hardware" | "software" | "network" | "access" | "other"

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  department?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  ticket_number: string
  title: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  category: TicketCategory
  created_by: string
  assigned_to?: string
  sla_response_time?: number
  sla_resolution_time?: number
  response_deadline?: string
  resolution_deadline?: string
  responded_at?: string
  resolved_at?: string
  closed_at?: string
  resolution_rating?: number
  resolution_feedback?: string
  resolution_confirmed_at?: string
  resolution_confirmed_by?: string
  created_at: string
  updated_at: string
  creator?: User
  assignee?: User
}

export interface Asset {
  id: string
  asset_code: string
  name: string
  category: string
  subcategory?: string | null
  description?: string | null
  status: string
  lifecycle_stage: string
  quantity: number
  acquisition_date?: string | null
  last_maintenance_date?: string | null
  next_maintenance_date?: string | null
  warranty_expires_at?: string | null
  license_expiry?: string | null
  location?: string | null
  inventoried: boolean
  support_owner?: string | null
  support_owner_profile?: Pick<User, "id" | "full_name" | "email" | "role"> | null
  created_at?: string | null
  updated_at?: string | null
}

export interface Message {
  id: string
  ticket_id: string
  user_id: string
  message: string
  is_internal: boolean
  created_at: string
  user?: User
}

export interface TicketHistory {
  id: string
  ticket_id: string
  user_id: string
  action: string
  old_value?: string
  new_value?: string
  created_at: string
  user?: User
}
