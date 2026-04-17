export type UserRole = "guest" | "staff" | "admin";
export type IncidentType = "fire" | "medical" | "security" | "theft";
export type IncidentSource = "manual" | "iot" | "cctv";
export type IncidentStatus = "pending" | "acknowledged" | "en_route" | "resolved";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface LocationPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  source: IncidentSource;
  status: IncidentStatus;
  priority: IncidentSeverity;
  severity: IncidentSeverity;
  guestId: string;
  guestEmail?: string;
  guestRoomNumber?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedStaffEmail?: string;
  assignedStaffDepartment?: string;
  assignedTeam?: string[];
  notifiedDepartments?: string[];
  responderDistanceMeters?: number;
  createdAt: string;
  updatedAt: string;
  timestamp?: string;
  location: LocationPoint;
  notes?: string;
  affectedPeople?: number;
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
