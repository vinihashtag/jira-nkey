
export interface ProjectDetails {
    id: string;
    name: string;
    totalSpend: string;
    totalSpendSeconds: number;
    issueIds: Set<string>;
}