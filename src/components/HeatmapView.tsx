import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { FloorPlan, Measurement, AccessPoint } from '../types';

interface HeatmapViewProps {
  floorPlan?: FloorPlan;
  measurements: Measurement[];
}

export function HeatmapView({ floorPlan, measurements }: HeatmapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [radius, setRadius] = useState([80]);
  const [opacity, setOpacity] = useState([70]);
  const [showAll, setShowAll] = useState(true);
  const [selectedAP, setSelectedAP] = useState<string>('all');

  const accessPoints: AccessPoint[] = Array.from(
    new Map(
      measurements.map(m => [
        m.bssid,
        { bssid: m.bssid, ssid: m.ssid, channel: m.channel, frequency: m.frequency }
      ])
    ).values()
  );

  const getColorForSignal = (strength: number): [number, number, number] => {
    // Normalize signal strength from -85 to -35 dBm
    const normalized = Math.max(0, Math.min(1, (strength + 85) / 50));
    
    if (normalized < 0.5) {
      // Red to Yellow
      const factor = normalized * 2;
      return [255, Math.floor(255 * factor), 0];
    } else {
      // Yellow to Green
      const factor = (normalized - 0.5) * 2;
      return [Math.floor(255 * (1 - factor)), 255, 0];
    }
  };

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    if (!canvas || !floorPlan) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = floorPlan.width;
    canvas.height = floorPlan.height;

    // Draw floor plan
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Filter measurements
      const filteredMeasurements = showAll
        ? measurements
        : measurements.filter(m => m.bssid === selectedAP);

      // Draw heatmap
      ctx.globalAlpha = opacity[0] / 100;

      filteredMeasurements.forEach(m => {
        const gradient = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, radius[0]);
        const color = getColorForSignal(m.signalStrength);
        gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`);
        gradient.addColorStop(0.5, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.4)`);
        gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(
          m.x - radius[0],
          m.y - radius[0],
          radius[0] * 2,
          radius[0] * 2
        );
      });

      ctx.globalAlpha = 1;

      // Draw measurement points
      filteredMeasurements.forEach(m => {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };
    img.src = floorPlan.imageUrl;
  };

  useEffect(() => {
    drawHeatmap();
  }, [floorPlan, measurements, radius, opacity, showAll, selectedAP]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-2">Heatmap Visning</h1>
          <p className="text-muted-foreground">
            Visualisering af WiFi-dækning med farveskala
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filtre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Vis alle AP</Label>
                    <Switch
                      checked={showAll}
                      onCheckedChange={setShowAll}
                    />
                  </div>
                </div>

                {!showAll && (
                  <div className="space-y-2">
                    <Label>Vælg Access Point</Label>
                    <Select value={selectedAP} onValueChange={setSelectedAP}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accessPoints.map(ap => (
                          <SelectItem key={ap.bssid} value={ap.bssid}>
                            {ap.ssid} ({ap.bssid.slice(0, 8)}...)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Radius</Label>
                    <span className="text-sm text-muted-foreground">{radius[0]}px</span>
                  </div>
                  <Slider
                    value={radius}
                    onValueChange={setRadius}
                    min={20}
                    max={200}
                    step={10}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Gennemsigtighed</Label>
                    <span className="text-sm text-muted-foreground">{opacity[0]}%</span>
                  </div>
                  <Slider
                    value={opacity}
                    onValueChange={setOpacity}
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Signalstyrke</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-r from-green-500 to-green-600"></div>
                    <div className="text-sm">
                      <div>-35 til -50 dBm</div>
                      <div className="text-xs text-muted-foreground">Fremragende</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-r from-yellow-400 to-yellow-500"></div>
                    <div className="text-sm">
                      <div>-51 til -70 dBm</div>
                      <div className="text-xs text-muted-foreground">God</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-r from-red-500 to-red-600"></div>
                    <div className="text-sm">
                      <div>-71 til -85 dBm</div>
                      <div className="text-xs text-muted-foreground">Svag</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistik</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Målinger</span>
                  <span>{showAll ? measurements.length : measurements.filter(m => m.bssid === selectedAP).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Access Points</span>
                  <span>{accessPoints.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gennemsnit</span>
                  <span>
                    {measurements.length > 0
                      ? Math.round(measurements.reduce((acc, m) => acc + m.signalStrength, 0) / measurements.length)
                      : 0}{' '}
                    dBm
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Heatmap Canvas */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Heatmap</CardTitle>
                <CardDescription>
                  {showAll ? 'Viser alle access points' : `Viser ${accessPoints.find(ap => ap.bssid === selectedAP)?.ssid || 'valgt AP'}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {floorPlan ? (
                  <div className="border rounded-lg overflow-hidden bg-muted">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="border border-dashed rounded-lg h-96 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <p>Upload en plantegning og tilføj målepunkter først</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
