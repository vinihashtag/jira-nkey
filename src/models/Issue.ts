export interface Issue {
    expand: string;
    id: string;
    self: string;
    key: string;
    fields: Fields
}

interface Fields {
    project: Project;
}

interface Project {
    id: string;
    self: string;
    key: string;
    name: string;
    projectTypeKey: string;
    simplified: boolean;
}