"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Shield, 
  Activity, 
  MapPin, 
  Navigation, 
  MessageSquare, 
  Phone, 
  Flame, 
  HeartPulse, 
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  Mic,
  Plus,
  X,
  Focus
} from "lucide-react";
import styles from "@/styles/guest-dashboard.module.css";
import LiveMap from "@/components/LiveMap";
import EmergencyAiAssistant from "@/components/guest/EmergencyAiAssistant";
import { Incident, IncidentSource, IncidentType, LocationPoint } from "@/types";

interface GuestDashboardProps {
  user: any;
  activeIncident?: Incident;
  geoLocation: LocationPoint;
  nearestExit: { label: string; distance: number; direction: string } | null;
  responderDistance?: number;
  onTrigger: (type: IncidentType, source: IncidentSource, notes?: string) => Promise<void>;
  incidents: Incident[];
  timelineEvents: any[];
}

const EMERGENCY_STEPS: Record<IncidentType | "default", string[]> = {
  fire: [
    "Move to the nearest stairwell immediately.",
    "Stay low to the ground to avoid smoke inhalation.",
    "Do not use elevators under any circumstances.",
    "Proceed to the designated assembly point outside."
  ],
  medical: [
    "Stay with the person and keep them calm.",
    "Do not move them unless they are in immediate danger.",
    "Clear a path for the emergency response team.",
    "Prepare to share known allergies or medical history."
  ],
  security: [
    "Lock your door and stay away from windows.",
    "Silence your mobile devices.",
    "Do not open the door until a verified staff member arrives.",
    "Stay low and maintain silence."
  ],
  theft: [
    "Remain calm and do not pursue the suspect.",
    "Note physical descriptions and direction of travel.",
    "Secure the scene and do not touch any evidence.",
    "Report all missing items to the security team."
  ],
  default: [
    "Stay calm and follow voice announcements.",
    "Check the dashboard for real-time updates.",
    "Keep corridors clear for emergency personnel.",
    "Have your identification and keys ready."
  ]
};

export default function GuestDashboard({
  user,
  activeIncident,
  geoLocation,
  nearestExit,
  responderDistance,
  onTrigger,
  incidents,
  timelineEvents
}: GuestDashboardProps) {
  const [fabOpen, setFabOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const incidentType = activeIncident?.type || "default";
  const steps = EMERGENCY_STEPS[incidentType as keyof typeof EMERGENCY_STEPS] || EMERGENCY_STEPS.default;

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleTriggerWithFab = (type: IncidentType) => {
    onTrigger(type, "manual", `Emergency reported via Guest Command Center`);
    setFabOpen(false);
  };

  const toggleVoice = () => {
    setIsAiSpeaking(!isAiSpeaking);
  };

  return (
    <div className={styles.dashboardShell} suppressHydrationWarning>
      {/* 1. TOP BAR */}
      <div className={styles.statusStrip}>
        <div className={styles.statusLeft}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Crisis Line</span>
            <span className={styles.statusValue} style={{ color: '#ff4d4d' }}>
              <Phone size={14} /> 112
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>System Status</span>
            <span className={styles.statusValue}>
              <div className={styles.pulsingDot} /> Live
            </span>
          </div>
        </div>

        {activeIncident && (
          <div className={styles.liveIncidentIndicator}>
            🚨 LIVE INCIDENT: {activeIncident.type.toUpperCase()}
          </div>
        )}

        <div className={styles.statusRight}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Authorized User</span>
            <span className={styles.statusValue}>Guest #{user?.uid?.slice(-4)}</span>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* 2. LEFT: ALERT PANEL */}
        <div className={`${styles.alertPanel} ${!activeIncident ? styles.alertPanelSafe : ""}`}>
          {activeIncident && <div className={styles.alertGlow} />}
          
          <div className={styles.alertHeader}>
            <span className={styles.statusLabel} style={{ color: activeIncident ? '#ff4d4d' : 'inherit' }}>
              {activeIncident ? 'Critical Alert' : 'Operational Status'}
            </span>
            <h1 className={styles.alertTitle}>
              {activeIncident ? `${activeIncident.type.toUpperCase()} DETECTED` : 'STATUS: SECURE'}
            </h1>
            <p className={styles.alertSubtitle}>
              {activeIncident 
                ? `Source: ${activeIncident.source === 'iot' ? 'IoT Sensor Grid' : 'Manual Trigger'}`
                : 'No active threats detected in your vicinity.'}
            </p>
          </div>

          <div className={styles.alertMetaGrid}>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>Responder Status</div>
              <div className={styles.metaValue}>
                {activeIncident?.status === 'assigned' ? 'En Route' : 'Awaiting Dispatch'}
              </div>
            </div>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>Distance / ETA</div>
              <div className={styles.metaValue}>
                {responderDistance ? `${responderDistance}m` : '--'}
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>
                  (~{Math.ceil((responderDistance || 0) / 80)}m)
                </span>
              </div>
            </div>
          </div>

          <button 
            className={styles.primaryActionBtn}
            onClick={() => handleTriggerWithFab("fire")}
          >
            {activeIncident ? 'I NEED ADDITIONAL HELP' : 'GET EMERGENCY HELP'}
          </button>
          
          {activeIncident && (
            <button className={styles.secondaryActionBtn}>
              I AM SAFE / FALSE ALARM
            </button>
          )}
        </div>

        {/* 3. RIGHT: AI GUIDANCE */}
        <div className={styles.guidancePanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <div className={styles.aiIndicator} />
              AI MISSION GUIDANCE
            </div>
            <button 
              className={`${styles.actionChip} ${isAiSpeaking ? styles.stepActive : ""}`}
              onClick={toggleVoice}
            >
              <Mic size={16} /> {isAiSpeaking ? 'AI Speaking...' : 'Voice Assist'}
            </button>
          </div>

          <div className={styles.stepList}>
            {steps.map((step, idx) => (
              <div 
                key={idx} 
                className={`${styles.stepItem} ${currentStep === idx ? styles.stepActive : ""}`}
              >
                <div className={styles.stepNumber}>{idx + 1}</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepText}>{step}</div>
                  {currentStep === idx && (
                    <div className={styles.stepMeta}>Recommended Action • Active Now</div>
                  )}
                </div>
                {currentStep === idx && (
                  <Activity size={18} color="#38bdf8" />
                )}
              </div>
            ))}
          </div>

          <div className={styles.intelligenceGrid}>
            <div className={styles.intelBox}>
              <Navigation size={18} color="#38bdf8" />
              <div>
                <div className={styles.intelLabel}>Nearest Exit</div>
                <div className={styles.intelValue}>
                  {nearestExit ? `${nearestExit.distance}m → ${nearestExit.direction}` : 'Check Map'}
                </div>
              </div>
            </div>
            <div className={styles.intelBox}>
              <Shield size={18} color="#10b981" />
              <div>
                <div className={styles.intelLabel}>Zone Safety</div>
                <div className={styles.intelValue}>Stable</div>
              </div>
            </div>
          </div>

          <div className={styles.chipGroup}>
            <button className={styles.actionChip} onClick={() => setCurrentStep(0)}>Reset Steps</button>
            <button className={styles.actionChip} onClick={handleNextStep}>Next Step <ArrowRight size={14} /></button>
            <button className={styles.actionChip}>Exit Map</button>
          </div>
        </div>

        {/* 4. LIVE MAP */}
        <section className={styles.mapSection}>
          <div className={styles.mapControls}>
            <button className={styles.mapBtn}><Focus size={18} /> Focus Safe Zone</button>
            <button className={styles.mapBtn}><Navigation size={18} /> Escape Route</button>
          </div>
          <LiveMap 
            incidents={incidents}
            guestLocation={geoLocation}
            focusIncident={activeIncident}
          />
        </section>

        {/* 5. LOWER GRID: AI ASSISTANT + TIMELINE */}
        <div className={styles.lowerGrid}>
          <div className={styles.aiAssistant}>
            <div className={styles.panelTitle} style={{ marginBottom: '1.5rem' }}>
              <MessageSquare size={20} color="#38bdf8" />
              Emergency AI Assistant
            </div>
            <EmergencyAiAssistant />
          </div>

          <div className={styles.timelinePanel}>
            <div className={styles.panelTitle} style={{ marginBottom: '2rem' }}>
              <Activity size={20} color="#ff4d4d" />
              Incident Log
            </div>
            <div className={styles.timelineList}>
              {timelineEvents.map((event, idx) => (
                <div key={idx} className={styles.timelineItem}>
                  <div className={`${styles.timelineDot} ${
                    event.status === 'resolved' ? styles.dotSuccess : 
                    event.status === 'active' ? styles.dotCritical : styles.dotWarning
                  }`}>
                    {event.status === 'active' ? <Flame size={10} /> : <Activity size={10} />}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>{event.label}</span>
                      <span className={styles.timelineTime}>{event.time}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                      {event.notes}
                    </p>
                    <div className={styles.timelineStatusPill} style={{
                       color: event.status === 'resolved' ? '#10b981' : event.status === 'active' ? '#ff4d4d' : '#fbbf24'
                    }}>
                      {event.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
              {timelineEvents.length === 0 && (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  No active incidents. Monitor this feed for system logs.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. FLOATING ACTION BUTTON */}
      <div className={`${styles.fabWrapper} ${fabOpen ? styles.fabActive : ""}`}>
        <div className={styles.fabExpanded}>
          <div className={styles.fabOption} onClick={() => handleTriggerWithFab("fire")}>
            <Flame size={20} color="#ff4d4d" /> Report Fire
          </div>
          <div className={styles.fabOption} onClick={() => handleTriggerWithFab("medical")}>
            <HeartPulse size={20} color="#3b82f6" /> Medical Emergency
          </div>
          <div className={styles.fabOption} onClick={() => handleTriggerWithFab("security")}>
            <Shield size={20} color="#fbbf24" /> Security Threat
          </div>
        </div>
        <button 
          className={styles.fab}
          onClick={() => setFabOpen(!fabOpen)}
          aria-label="Report Emergency"
        >
          {fabOpen ? <X size={32} /> : <Plus size={32} />}
        </button>
      </div>
    </div>
  );
}
