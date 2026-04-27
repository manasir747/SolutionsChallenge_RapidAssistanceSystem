import React from "react";
import styles from "@/styles/dashboard.module.css";
import { IncidentType, IncidentSource } from "@/types";
export const ADMIN_IOT_SIMULATIONS: { type: IncidentType; source: IncidentSource; hint: string; label: string }[] = [
  { type: "fire", source: "iot", hint: "Smoke detected in Sector 4", label: "IoT Fire Event" },
  { type: "medical", source: "iot", hint: "Abnormal heart rate detected", label: "Wearable SOS" },
  { type: "security", source: "manual", hint: "Unverified access attempt", label: "Security Breach" },
  { type: "theft", source: "manual", hint: "Asset moved outside geofence", label: "Asset Tracking" }
];

interface SimulationPanelProps {
  simulationMode: "live" | "sim";
  setSimulationMode: (mode: "live" | "sim") => void;
  selectedScenario: IncidentType | null;
  setSelectedScenario: (scenario: IncidentType | null) => void;
  simSeverity: "low" | "medium" | "critical";
  setSimSeverity: (severity: "low" | "medium" | "critical") => void;
  simLocation: string;
  setSimLocation: (loc: string) => void;
  simSensitivity: number;
  setSimSensitivity: (sens: number) => void;
  isSimRunning: boolean;
  setIsSimRunning: (running: boolean) => void;
  simTimeline: Array<{ time: string; event: string; status: string }>;
  onSimulate: (type: IncidentType, source: IncidentSource, hint: string) => void;
}

export default function SimulationPanel({
  simulationMode,
  setSimulationMode,
  selectedScenario,
  setSelectedScenario,
  simSeverity,
  setSimSeverity,
  simLocation,
  setSimLocation,
  simSensitivity,
  setSimSensitivity,
  isSimRunning,
  setIsSimRunning,
  simTimeline,
  onSimulate
}: SimulationPanelProps) {
  return (
    <div className={`${styles.card} ${styles.simulationCommandCenter} ${simulationMode === 'sim' ? styles.modeSimActive : ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.ccHeaderMain}>
          <div className={styles.ccTitleGroup}>
            <h3>Simulation Testing</h3>
            <p className={styles.ccSubtext}>Run emergency drills and test system response</p>
          </div>
          <div className={styles.ccHeaderControls}>
            <div className={styles.modeToggle}>
              <button
                className={simulationMode === 'live' ? styles.activeMode : ''}
                onClick={() => setSimulationMode('live')}
              >Live</button>
              <button
                className={simulationMode === 'sim' ? styles.activeMode : ''}
                onClick={() => setSimulationMode('sim')}
              >Simulation</button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.adminSimulationGrid}>
        {ADMIN_IOT_SIMULATIONS.map((simulation) => {
          const isSelected = selectedScenario === simulation.type;
          return (
            <div
              key={`${simulation.source}-${simulation.type}`}
              className={`${styles.scenarioCard} ${isSelected ? styles.scenarioExpanded : ''} ${styles[`scenario${simulation.type.charAt(0).toUpperCase() + simulation.type.slice(1)}`]}`}
              onClick={() => setSelectedScenario(isSelected ? null : simulation.type)}
            >
              <div className={styles.scenarioCardHeader}>
                <div className={styles.scenarioIcon}>
                  {simulation.type === 'fire' && '🔥'}
                  {simulation.type === 'medical' && '🏥'}
                  {simulation.type === 'security' && '🛡️'}
                  {simulation.type === 'theft' && '🎒'}
                </div>
                <div className={styles.scenarioInfo}>
                  <strong>{simulation.label}</strong>
                  <span>{simulation.hint}</span>
                </div>
              </div>

              {isSelected && (
                <div className={styles.scenarioControls} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.controlGroup}>
                    <label>Severity Level</label>
                    <div className={styles.severitySwitch}>
                      {(['low', 'medium', 'critical'] as const).map(s => (
                        <button
                          key={s}
                          className={simSeverity === s ? styles[`active${s.charAt(0).toUpperCase() + s.slice(1)}`] : ''}
                          onClick={() => setSimSeverity(s)}
                        >{s}</button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.controlGroup}>
                    <label>Target Location</label>
                    <select value={simLocation} onChange={(e) => setSimLocation(e.target.value)} className={styles.ccSelect}>
                      <option>Floor 4, Wing B</option>
                      <option>Main Lobby</option>
                      <option>Conference Hall C</option>
                      <option>Staff Quarters</option>
                    </select>
                  </div>

                  <div className={styles.controlGroup}>
                    <label>Sensor Sensitivity ({simSensitivity}%)</label>
                    <input
                      type="range"
                      min="0" max="100"
                      value={simSensitivity}
                      onChange={(e) => setSimSensitivity(parseInt(e.target.value))}
                      className={styles.ccSlider}
                    />
                  </div>

                  <div className={styles.scenarioActions}>
                    <button
                      className={styles.primaryAction}
                      onClick={() => onSimulate(simulation.type, simulation.source, simulation.hint)}
                      disabled={isSimRunning}
                    >
                      {isSimRunning ? 'Simulation Running...' : 'Simulate Now'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isSimRunning && (
        <div className={styles.simulationTimeline}>
          <div className={styles.timelineHeader}>
            <h4>Simulation Active: {selectedScenario?.toUpperCase()}</h4>
            <button onClick={() => setIsSimRunning(false)} className={styles.closeSim}>Terminate</button>
          </div>
          <div className={styles.timelineStrip}>
            {simTimeline.map((t, idx) => (
              <div key={idx} className={`${styles.timelineStep} ${styles[`step${t.status.charAt(0).toUpperCase() + t.status.slice(1)}`]}`}>
                <span className={styles.stepTime}>{t.time}</span>
                <span className={styles.stepEvent}>{t.event}</span>
                <div className={styles.stepDot}></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
