"use client";

import { Wrapper } from "@googlemaps/react-wrapper";
import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Navigation, Layers, Info, Focus } from "lucide-react";
import styles from "@/styles/map.module.css";
import { Incident, LocationPoint } from "@/types";
import { DEFAULT_LOCATION, MOCK_EXITS } from "@/lib/constants";

interface LiveMapProps {
  incidents: Incident[];
  focusIncident?: Incident;
  guestLocation?: LocationPoint;
  responderLocation?: LocationPoint;
}

const MapCanvas = ({ incidents, focusIncident, guestLocation, responderLocation, isFullscreen, setIsFullscreen }: LiveMapProps & { isFullscreen: boolean; setIsFullscreen: (v: boolean) => void }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const circles = useRef<google.maps.Circle[]>([]);
  const paths = useRef<google.maps.Polyline[]>([]);

  const center = useMemo(() => focusIncident?.location ?? guestLocation ?? DEFAULT_LOCATION, [focusIncident, guestLocation]);

  useEffect(() => {
    if (!mapRef.current || typeof google === "undefined") return;
    if (!mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: 16,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        styles: [
          { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
          { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] }
        ]
      });
    } else {
      mapInstance.current.panTo(center);
    }
  }, [center]);

  useEffect(() => {
    if (!mapInstance.current || typeof google === "undefined") return;
    
    // Clear existing
    markers.current.forEach((m) => m.setMap(null));
    circles.current.forEach((c) => c.setMap(null));
    paths.current.forEach((p) => p.setMap(null));
    markers.current = [];
    circles.current = [];
    paths.current = [];

    // 1. Incidents with Danger Zones
    incidents.forEach((incident) => {
      const isFire = incident.type === "fire";
      const color = isFire ? "#ef4444" : incident.type === "medical" ? "#06b6d4" : "#f59e0b";
      
      const marker = new google.maps.Marker({
        map: mapInstance.current!,
        position: incident.location,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        },
        optimized: false
      });
      markers.current.push(marker);

      if (isFire || incident.type === "security") {
        const circle = new google.maps.Circle({
          map: mapInstance.current!,
          center: incident.location,
          radius: isFire ? 40 : 25,
          fillColor: color,
          fillOpacity: 0.15,
          strokeColor: color,
          strokeOpacity: 0.5,
          strokeWeight: 1
        });
        circles.current.push(circle);
      }
    });

    // 2. Exits
    MOCK_EXITS.forEach((point) => {
      const marker = new google.maps.Marker({
        map: mapInstance.current!,
        position: point,
        title: point.label,
        icon: {
          path: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
          scale: 1.2,
          fillColor: "#10b981",
          fillOpacity: 1,
          strokeWeight: 0,
          rotation: 0
        }
      });
      markers.current.push(marker);
    });

    // 3. User & Responder
    if (guestLocation) {
      markers.current.push(new google.maps.Marker({
        map: mapInstance.current!,
        position: guestLocation,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#facc15",
          fillOpacity: 1,
          strokeWeight: 0
        }
      }));
    }

    if (responderLocation) {
      markers.current.push(new google.maps.Marker({
        map: mapInstance.current!,
        position: responderLocation,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: "#38bdf8",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2
        }
      }));

      if (guestLocation) {
        const path = new google.maps.Polyline({
          map: mapInstance.current!,
          path: [guestLocation, responderLocation],
          strokeColor: "#38bdf8",
          strokeOpacity: 0.8,
          strokeWeight: 3,
          icons: [{
            icon: { path: google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 2 },
            offset: '50%'
          }]
        });
        paths.current.push(path);
      }
    }

  }, [incidents, guestLocation, responderLocation]);

  const handleFocusSafeZone = () => {
    if (!mapInstance.current || !guestLocation) return;
    let nearest = MOCK_EXITS[0];
    let minDistance = Number.MAX_VALUE;
    MOCK_EXITS.forEach(exit => {
      const dist = Math.sqrt(Math.pow(exit.lat - guestLocation.lat, 2) + Math.pow(exit.lng - guestLocation.lng, 2));
      if (dist < minDistance) {
        minDistance = dist;
        nearest = exit;
      }
    });
    mapInstance.current.panTo(nearest);
    mapInstance.current.setZoom(18);
  };

  const handleEscapeRoute = () => {
    if (!mapInstance.current || !guestLocation) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(guestLocation);
    MOCK_EXITS.forEach(exit => bounds.extend(exit));
    mapInstance.current.fitBounds(bounds, 50);
  };

  return (
    <div className={styles.mapContainer}>
      <div ref={mapRef} className={styles.mapCanvas} />
      
      {/* Overlays moved here to access mapInstance */}
      <div className={styles.mapOverlayTop}>
        <div className={styles.mapPill}>
          <div className={styles.pulseDot}></div>
          <span>Live Deployment Area</span>
        </div>
      </div>

      <div className={styles.tacticalActions}>
        <button className={styles.tacticalBtn} onClick={handleFocusSafeZone}>
          <Focus size={16} /> Focus Safe Zone
        </button>
        <button className={styles.tacticalBtn} onClick={handleEscapeRoute}>
          <Navigation size={16} /> Escape Route
        </button>
      </div>

      <div className={styles.mapControls}>
        <button 
          className={styles.controlBtn} 
          title="Recenter"
          onClick={() => {
            if (mapInstance.current) {
              mapInstance.current.panTo(center);
              mapInstance.current.setZoom(16);
            }
          }}
        ><Navigation size={18} /></button>
        <button className={styles.controlBtn} title="Layers"><Layers size={18} /></button>
        <div className={styles.controlDivider}></div>
        <button className={styles.controlBtn} onClick={() => setIsFullscreen(!isFullscreen)}>
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      <div className={styles.mapLegend}>
        <div className={styles.legendItem}><span style={{background:'#ef4444'}}></span> Fire</div>
        <div className={styles.legendItem}><span style={{background:'#06b6d4'}}></span> Medical</div>
        <div className={styles.legendItem}><span style={{background:'#10b981'}}></span> Safety Exit</div>
      </div>
    </div>
  );
};

export default function LiveMap(props: LiveMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!apiKey) {
    return (
      <div className={styles.mapShell}>
        <div className={styles.mapFallback}>
          <Info size={32} />
          <p>Real-time Terrain Engine Offline</p>
          <span>Awaiting Google Maps API Authentication</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.mapShell} ${isFullscreen ? styles.fullscreenMap : ''}`}>
      <Wrapper apiKey={apiKey}>
        <MapCanvas {...props} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
      </Wrapper>
    </div>
  );
}
