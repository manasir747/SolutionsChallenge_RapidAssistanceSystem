export type UserRole = "guest" | "staff" | "admin";
export type IncidentType = "fire" | "medical" | "security";
export type IncidentStatus = "pending" | "acknowledged" | "en_route" | "resolved";

export interface LocationPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  status: IncidentStatus;
  priority: "low" | "medium" | "high";
  guestId: string;
  assignedStaffId?: string;
  createdAt: string;
  updatedAt: string;
  location: LocationPoint;
  notes?: string;
  summary?: IncidentSummary;
}

export interface IncidentSummary {
  headline: string;
  timeline: string[];
  actions: string[];
}

export interface ChatMessage {
  id: string;
  incidentId: string;
  authorRole: UserRole;
  authorId: string;
  message: string;
  createdAt: string;
}

export interface SuggestionCard {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
}

export interface StaffAssignment {
  id: string;
  staffId: string;
  incidentId: string;
  acceptedAt?: string;
}
