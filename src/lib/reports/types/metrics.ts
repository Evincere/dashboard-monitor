export interface ValidatorMetric {
    validatorId: string | null;
    _count: number;
    _avg: {
        validationTime: number | null;
    } | null;
}

export interface ValidatorUser {
    id: string;
    name: string;
    lastName: string;
}

export interface DocumentMetric {
    documentTypeId: number;
    status: string;
    _count: number;
}

export interface DocumentTypeInfo {
    id: number;
    name: string;
}