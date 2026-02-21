export interface ProjectItemEntity {
    number: number;
    title: string;
    repo: string;
    labels: string[];
    column: string;
    parentNumber?: number;
}
