export function calculateSLA(createdAt: Date, priority: 'low' | 'medium' | 'high'): number {
    const now = new Date();
    const timeDiff = now.getTime() - createdAt.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    let slaHours: number;

    switch (priority) {
        case 'low':
            slaHours = 48; // 2 days
            break;
        case 'medium':
            slaHours = 24; // 1 day
            break;
        case 'high':
            slaHours = 8; // 8 hours
            break;
        default:
            slaHours = 24; // default to medium
    }

    return slaHours - hoursDiff;
}

export function isSLABreached(createdAt: Date, priority: 'low' | 'medium' | 'high'): boolean {
    const remainingSLA = calculateSLA(createdAt, priority);
    return remainingSLA < 0;
}