import { IncidentSource, IncidentType, LocationPoint, UserRole } from "@/types";

export const EMERGENCY_TYPES: { type: IncidentType; label: string; hint: string }[] = [
  { type: "fire", label: "Fire", hint: "Smoke, alarm, structural" },
  { type: "medical", label: "Medical", hint: "Injury, illness" },
  { type: "security", label: "Security", hint: "Threat, altercation" }
];

export const IOT_TRIGGER_TYPES: { type: IncidentType; label: string; hint: string }[] = [
  { type: "fire", label: "Trigger Fire (IoT Sensor)", hint: "Heat and flame telemetry" },
  { type: "fire", label: "Trigger Smoke Detection", hint: "Smoked air quality alert" }
];

export const CCTV_TRIGGER_TYPES: { type: IncidentType; label: string; hint: string }[] = [
  { type: "theft", label: "Trigger Theft (CCTV)", hint: "Unusual movement and asset removal" },
  { type: "security", label: "Suspicious Activity Detected", hint: "Crowd anomaly or tailgating" }
];

export const INCIDENT_SOURCE_LABELS: Record<IncidentSource, string> = {
  manual: "Manual",
  iot: "IoT Sensor",
  cctv: "CCTV / AI"
};

export const MOCK_EXITS: LocationPoint[] = [
  { lat: 12.972, lng: 77.595, label: "MG Road Exit" },
  { lat: 12.971, lng: 77.594, label: "Cubbon Park Exit" },
  { lat: 12.973, lng: 77.593, label: "Vidhana Soudha Exit" }
];

export const ROLE_LABELS: Record<UserRole, string> = {
  guest: "Guest",
  staff: "Response Staff",
  admin: "Command"
};

export const DEFAULT_LOCATION: LocationPoint = {
  lat: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "12.9716"),
  lng: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "77.5946"),
  label: "Cyber Hub"
};
