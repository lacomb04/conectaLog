export interface Ticket {
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved' | 'waiting_response' | 'closed';
    created_at?: string;
    updated_at?: string;
    createdAt?: string;
    updatedAt?: string;
    user_id?: string;
    created_by?: string;
    assigned_to?: string | null;
    category?: string;
    ticket_number?: string;
    responded_at?: string | null;
    resolved_at?: string | null;
    response_deadline?: string | null;
    resolution_deadline?: string | null;
    importance?: string | null;
    comments?: TicketComment[];
}

export interface User {
    id: string;
    name: string;
    email: string;
}

export interface Status {
    id: string;
    name: string;
    description: string;
}

export interface TicketComment {
    id: string;
    ticket_id: string;
    content: string;
    created_at: string;
    user_id?: string;
}