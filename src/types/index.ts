// Types for WiFi Coverage Analysis Application

export interface Project {
  id: string;
  name: string;
  description: string;
  building: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'measuring' | 'completed';
  floorPlan?: FloorPlan;
  measurements: Measurement[];
}

export interface FloorPlan {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'png' | 'svg' | 'jpg';
  imageUrl: string;
  width: number;
  height: number;
  scale?: {
    pixelsPerMeter: number;
    referencePoints: ReferencePoint[];
  };
}

export interface ReferencePoint {
  id: string;
  x: number;
  y: number;
  realWorldDistance?: number;
}

export interface Measurement {
  id: string;
  x: number;
  y: number;
  signalStrength: number; // dBm
  ssid: string;
  bssid: string;
  frequency: number; // MHz
  channel: number;
  timestamp: Date;
  notes?: string;
}

export interface AccessPoint {
  bssid: string;
  ssid: string;
  channel: number;
  frequency: number;
}

export interface HeatmapConfig {
  showAll: boolean;
  selectedAP?: string;
  radius: number;
  opacity: number;
}
