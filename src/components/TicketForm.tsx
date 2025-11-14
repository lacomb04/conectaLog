import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Ticket } from '../types';

const TicketForm: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [importance, setImportance] = useState('Baixa');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const { data, error } = await supabase
            .from<Ticket>('tickets')
            .insert([{ title, description, importance, status: 'Aberto' }]);

        if (error) {
            console.error('Erro ao criar chamado:', error);
        } else {
            console.log('Chamado criado com sucesso:', data);
            setTitle('');
            setDescription('');
            setImportance('Baixa');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label htmlFor="title">Título:</label>
                <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
            </div>
            <div>
                <label htmlFor="description">Descrição:</label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />
            </div>
            <div>
                <label htmlFor="importance">Grau de Importância:</label>
                <select
                    id="importance"
                    value={importance}
                    onChange={(e) => setImportance(e.target.value)}
                >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                </select>
            </div>
            <button type="submit">Abrir Chamado</button>
        </form>
    );
};

export default TicketForm;