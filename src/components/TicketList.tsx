import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Ticket } from '../types';

const TicketList: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchTickets = async () => {
            const { data, error } = await supabase
                .from('tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching tickets:', error);
            } else {
                setTickets(data);
            }
            setLoading(false);
        };

        fetchTickets();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2>Lista de Chamados</h2>
            <ul>
                {tickets.map(ticket => (
                    <li key={ticket.id}>
                        <h3>{ticket.title}</h3>
                        <p>Status: {ticket.status}</p>
                        <p>Prioridade: {ticket.priority ?? 'N/A'}</p>
                        <p>
                            Data de Abertura:{' '}
                            {ticket.created_at
                                ? new Date(ticket.created_at).toLocaleString()
                                : '—'}
                        </p>
                        <a href={`/tickets/${ticket.id}`}>Ver Detalhes</a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TicketList;