"use client";

import { Wrapper } from "@googlemaps/react-wrapper";
import { useEffect, useMemo, useRef } from "react";
import styles from "@/styles/map.module.css";
import { Incident, LocationPoint } from "@/types";
import { DEFAULT_LOCATION, MOCK_EXITS } from "@/lib/constants";

interface LiveMapProps {
  incidents: Incident[];
  focusIncident?: Incident;
  guestLocation?: LocationPoint;
}

const MapCanvas = ({ incidents, focusIncident, guestLocation }: LiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);

  const center = focusIncident?.location ?? guestLocation ?? DEFAULT_LOCATION;

  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: 15,
        disableDefaultUI: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#0b0d16" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#9ba4c7" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#05060a" }] },
          {
            featureType: "water",
            stylers: [{ color: "#11182f" }]
          }
        ]
      });
    } else {
      mapInstance.current.setCenter(center);
    }
  }, [center]);

  useEffect(() => {
    if (!mapInstance.current) return;
    markers.current.forEach((marker) => marker.setMap(null));

    const nextMarkers: google.maps.Marker[] = [];

    incidents.forEach((incident) => {
      nextMarkers.push(
        new google.maps.Marker({
          map: mapInstance.current!,
          position: incident.location,
          title: `${incident.type.toUpperCase()} • ${incident.status}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: incident.type === "fire" ? "#ff5f6d" : "#5de0e6",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2
          }
        })
      );
    });

    MOCK_EXITS.forEach((point) => {
      nextMarkers.push(
        new google.maps.Marker({
          map: mapInstance.current!,
          position: point,
          title: point.label,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#5ef38c",
            fillOpacity: 1,
            strokeWeight: 0
          }
        })
      );
    });

    if (guestLocation) {
      nextMarkers.push(
        new google.maps.Marker({
          map: mapInstance.current!,
          position: guestLocation,
          title: "Guest location",
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#ffc857",
            fillOpacity: 1,
            strokeWeight: 0
          }
        })
      );
    }

    markers.current = nextMarkers;
  }, [incidents, guestLocation]);

  return <div ref={mapRef} className={styles.mapCanvas} />;
};

export default function LiveMap(props: LiveMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const memoizedProps = useMemo(() => props, [props]);

  if (!apiKey) {
    return (
      <div className={styles.mapShell}>
        <p>Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable live maps.</p>
      </div>
    );
  }

  return (
    <div className={styles.mapShell}>
      <Wrapper apiKey={apiKey}>
        <MapCanvas {...memoizedProps} />
      </Wrapper>
    </div>
  );
}
