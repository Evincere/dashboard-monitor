export interface ValidationStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  required: number;
  completionPercentage: number;
}

export interface PostulantInfo {
  dni: string;
  name: string;
  status: string;
  user: {
    dni: string;
    fullName: string;
    email: string;
    telefono?: string;
  };
  inscription: {
    id: string;
    state: string;
    centroDeVida: string;
    createdAt: string;
  };
  contest: {
    id: number;
    title: string;
    category: string;
    position: string;
    department: string;
    contestClass: string;
    status: string;
    statusDescription: string;
    inscriptionStartDate: string;
    inscriptionEndDate: string;
    dependency?: string;
    location?: string;
  };
}

export interface ValidationData {
  postulant: PostulantInfo;
  documents: Document[];
  stats: ValidationStats;
}
