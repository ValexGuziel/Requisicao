export interface Order {
  id: number;
  requester: string;
  equipment_tag: string;
  equipment_name: string;
  sector: string;
  maintenance_type: string;
  problem_description: string;
  status: 'open' | 'finished';
  created_at: string;
  finished_at?: string;
  technician_name?: string;
  service_performed?: string;
}

export interface Technician {
  id: number;
  name: string;
  finished_count?: number;
}

export interface Stats {
  total: number;
  open: number;
  finished: number;
  sectors: { name: string; value: number }[];
  equipment: { name: string; value: number }[];
}

export interface Equipment {
  tag: string;
  name: string;
  sector: string;
}
