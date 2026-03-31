import { IncidentType, LocationPoint, UserRole } from "@/types";

export const EMERGENCY_TYPES: { type: IncidentType; label: string; hint: string }[] = [
  { type: "fire", label: "Fire", hint: "Smoke, alarm, structural" },
  { type: "medical", label: "Medical", hint: "Injury, illness" },
  { type: "security", label: "Security", hint: "Threat, altercation" }
];

export const MOCK_EXITS: LocationPoint[] = [
  { lat: 25.204, lng: 55.272, label: "Sky Lobby Exit" },
  { lat: 25.205, lng: 55.268, label: "Harbor Exit" },
  { lat: 25.202, lng: 55.27, label: "Service Exit" }
];

export const ROLE_LABELS: Record<UserRole, string> = {
  guest: "Guest",
  staff: "Response Staff",
  admin: "Command"
};

export const DEFAULT_LOCATION: LocationPoint = {
  lat: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "25.2048"),
  lng: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "55.2708"),
  label: "Resort HQ"
};
