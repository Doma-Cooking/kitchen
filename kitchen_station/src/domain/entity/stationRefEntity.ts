export interface IssueRefEntity {
    type: 'issue';
    owner: string;
    repo: string;
    number: number;
}

export interface SlackRefEntity {
    type: 'slack';
    channelId: string;
    threadTs: string;
}

export type StationRefEntity = IssueRefEntity | SlackRefEntity;

export function serializeRef(ref: StationRefEntity): string {
    switch (ref.type) {
        case 'issue':
            return `${ref.owner}/${ref.repo}#${String(ref.number)}`;
        case 'slack':
            return `slack:${ref.channelId}:${ref.threadTs}`;
    }
}

export function parseRef(text: string): StationRefEntity {
    if (text.startsWith('slack:')) {
        const parts = text.split(':');
        if (parts.length !== 3 || !parts[1] || !parts[2]) {
            throw new Error(`Invalid slack ref: ${text}`);
        }
        return { type: 'slack', channelId: parts[1], threadTs: parts[2] };
    }

    const match = /^(.+?)\/(.+?)#(\d+)$/.exec(text);
    if (!match?.[1] || !match[2] || !match[3]) {
        throw new Error(`Invalid ref: ${text}`);
    }
    return { type: 'issue', owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}
