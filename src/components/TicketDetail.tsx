import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Ticket, TicketComment } from '../types';

const TicketDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<string>('');
    const [ticketComments, setTicketComments] = useState<TicketComment[]>([]);

    useEffect(() => {
        const fetchTicket = async () => {
            const { data, error } = await supabase
                .from('tickets')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching ticket:', error);
            } else {
                setTicket(data);
                const { data: commentData, error: commentError } = await supabase
                    .from('comments')
                    .select('*')
                    .eq('ticket_id', id)
                    .order('created_at', { ascending: true });

                if (commentError) {
                    console.error('Error fetching comments:', commentError);
                    setTicketComments([]);
                } else {
                    setTicketComments(commentData ?? []);
                }
            }
            setLoading(false);
        };

        fetchTicket();
    }, [id]);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (comments.trim() === '') return;

        const { error } = await supabase
            .from('comments')
            .insert([{ ticket_id: id, content: comments }]);

        if (error) {
            console.error('Error adding comment:', error);
        } else {
            setComments('');
            const { data: commentData, error: commentError } = await supabase
                .from('comments')
                .select('*')
                .eq('ticket_id', id)
                .order('created_at', { ascending: true });

            if (commentError) {
                console.error('Error fetching comments:', commentError);
            } else {
                setTicketComments(commentData ?? []);
            }
        }
    };

    if (loading) return <div>Loading...</div>;

    if (!ticket) return <div>Ticket not found.</div>;

    return (
        <div>
            <h2>Ticket Detail</h2>
            <h3>{ticket.title}</h3>
            <p>Status: {ticket.status}</p>
            <p>Prioridade: {ticket.priority ?? 'N/A'}</p>
            <p>Description: {ticket.description}</p>
            <h4>Comments</h4>
            <ul>
                {ticketComments.map((comment) => (
                    <li key={comment.id}>{comment.content}</li>
                ))}
            </ul>
            <form onSubmit={handleCommentSubmit}>
                <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add a comment..."
                />
                <button type="submit">Submit</button>
            </form>
        </div>
    );
};

export default TicketDetail;