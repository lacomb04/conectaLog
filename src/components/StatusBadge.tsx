import React from 'react';

interface StatusBadgeProps {
    status: 'Em andamento' | 'Resolvido' | 'Aguardando resposta';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    let badgeColor;

    switch (status) {
        case 'Em andamento':
            badgeColor = 'bg-yellow-500';
            break;
        case 'Resolvido':
            badgeColor = 'bg-green-500';
            break;
        case 'Aguardando resposta':
            badgeColor = 'bg-blue-500';
            break;
        default:
            badgeColor = 'bg-gray-500';
    }

    return (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-bold text-white rounded ${badgeColor}`}>
            {status}
        </span>
    );
};

export default StatusBadge;