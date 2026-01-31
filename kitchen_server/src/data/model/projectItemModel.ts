export interface ProjectItemContentModel {
    number: number;
    title: string;
    repo: string;
    labels: string[];
    parentNumber?: number;
}

export interface ProjectInfoModel {
    number: number;
    owner: string;
}
