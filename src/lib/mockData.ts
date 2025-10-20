import { Project } from '../types';

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Kontorhus København',
    description: 'WiFi-analyse af 3. etage',
    building: 'Hovedkontor',
    createdAt: new Date('2025-10-10'),
    updatedAt: new Date('2025-10-14'),
    status: 'completed',
    measurements: []
  },
  {
    id: '2',
    name: 'Produktionshallen',
    description: 'Fuld dækningsanalyse',
    building: 'Fabrik Nord',
    createdAt: new Date('2025-10-12'),
    updatedAt: new Date('2025-10-14'),
    status: 'measuring',
    measurements: []
  },
  {
    id: '3',
    name: 'Lager & Distribution',
    description: 'WiFi upgrade vurdering',
    building: 'Distributionscenter',
    createdAt: new Date('2025-10-13'),
    updatedAt: new Date('2025-10-13'),
    status: 'draft',
    measurements: []
  }
];

// Generate sample measurements for demo
export const generateSampleMeasurements = (count: number) => {
  const ssids = ['Corporate-WiFi', 'Guest-Network', 'IoT-Devices'];
  const measurements = [];
  
  for (let i = 0; i < count; i++) {
    const ssid = ssids[Math.floor(Math.random() * ssids.length)];
    measurements.push({
      id: `m-${i}`,
      x: Math.random() * 800 + 100,
      y: Math.random() * 500 + 100,
      signalStrength: Math.floor(Math.random() * 50) - 85, // -85 to -35 dBm
      ssid: ssid,
      bssid: `00:${Math.floor(Math.random() * 99).toString().padStart(2, '0')}:${Math.floor(Math.random() * 99).toString().padStart(2, '0')}:${Math.floor(Math.random() * 99).toString().padStart(2, '0')}:${Math.floor(Math.random() * 99).toString().padStart(2, '0')}:${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`,
      frequency: Math.random() > 0.5 ? 2400 : 5000,
      channel: Math.random() > 0.5 ? Math.floor(Math.random() * 11) + 1 : Math.floor(Math.random() * 24) + 36,
      timestamp: new Date(),
      notes: ''
    });
  }
  
  return measurements;
};
