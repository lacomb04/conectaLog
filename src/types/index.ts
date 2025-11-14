export interface Ticket {
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'open' | 'in_progress' | 'resolved' | 'waiting_for_response';
    createdAt: string;
    updatedAt: string;
    userId: string;
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