import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { FloorPlan, Measurement } from '../types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface MeasurementPointsProps {
  floorPlan?: FloorPlan;
  measurements: Measurement[];
  onAddMeasurement: (measurement: Measurement) => void;
  onUpdateMeasurement: (id: string, measurement: Measurement) => void;
  onDeleteMeasurement: (id: string) => void;
}

export function MeasurementPoints({
  floorPlan,
  measurements,
  onAddMeasurement,
  onUpdateMeasurement,
  onDeleteMeasurement
}: MeasurementPointsProps) {
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    signalStrength: '-60',
    ssid: '',
    bssid: '',
    frequency: '2400',
    channel: '6',
    notes: ''
  });

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectedPoint({ x, y });
    setShowDialog(true);
    setFormData({
      signalStrength: '-60',
      ssid: '',
      bssid: '',
      frequency: '2400',
      channel: '6',
      notes: ''
    });
  };

  const handleSaveMeasurement = () => {
    if (!selectedPoint) return;

    const measurement: Measurement = {
      id: editingId || `m-${Date.now()}`,
      x: selectedPoint.x,
      y: selectedPoint.y,
      signalStrength: parseFloat(formData.signalStrength),
      ssid: formData.ssid,
      bssid: formData.bssid,
      frequency: parseFloat(formData.frequency),
      channel: parseInt(formData.channel),
      timestamp: new Date(),
      notes: formData.notes
    };

    if (editingId) {
      onUpdateMeasurement(editingId, measurement);
      setEditingId(null);
    } else {
      onAddMeasurement(measurement);
    }

    setShowDialog(false);
    setSelectedPoint(null);
  };

  const handleEdit = (measurement: Measurement) => {
    setEditingId(measurement.id);
    setSelectedPoint({ x: measurement.x, y: measurement.y });
    setFormData({
      signalStrength: measurement.signalStrength.toString(),
      ssid: measurement.ssid,
      bssid: measurement.bssid,
      frequency: measurement.frequency.toString(),
      channel: measurement.channel.toString(),
      notes: measurement.notes || ''
    });
    setShowDialog(true);
  };

  const getSignalColor = (strength: number) => {
    if (strength >= -50) return 'text-green-600';
    if (strength >= -60) return 'text-green-500';
    if (strength >= -70) return 'text-yellow-500';
    if (strength >= -80) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-2">Målepunkter</h1>
          <p className="text-muted-foreground">
            Klik på kortet for at tilføje målepunkter
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Interaktivt kort</CardTitle>
                <CardDescription>
                  Klik for at tilføje nye målepunkter
                </CardDescription>
              </CardHeader>
              <CardContent>
                {floorPlan ? (
                  <div
                    className="relative border rounded-lg overflow-hidden bg-muted cursor-crosshair"
                    onClick={handleCanvasClick}
                  >
                    <img
                      src={floorPlan.imageUrl}
                      alt="Floor plan"
                      className="w-full h-auto"
                    />
                    {measurements.map((m) => (
                      <div
                        key={m.id}
                        className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white shadow-lg cursor-pointer"
                        style={{
                          left: `${m.x}px`,
                          top: `${m.y}px`,
                          backgroundColor: m.signalStrength >= -60 ? '#22c55e' :
                                         m.signalStrength >= -70 ? '#eab308' : '#ef4444'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(m);
                        }}
                      >
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs whitespace-nowrap bg-black/75 text-white px-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                          {m.signalStrength} dBm
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed rounded-lg h-96 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <p>Upload en plantegning først</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Statistik</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Totale målepunkter</div>
                  <div className="text-2xl">{measurements.length}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Gns. signalstyrke</div>
                  <div className="text-2xl">
                    {measurements.length > 0
                      ? Math.round(measurements.reduce((acc, m) => acc + m.signalStrength, 0) / measurements.length)
                      : 0}{' '}
                    dBm
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Unikke SSIDs</div>
                  <div className="text-2xl">
                    {new Set(measurements.map(m => m.ssid)).size}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Signalniveauer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    <span className="text-sm">Fremragende</span>
                  </div>
                  <span className="text-sm">
                    {measurements.filter(m => m.signalStrength >= -50).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">God</span>
                  </div>
                  <span className="text-sm">
                    {measurements.filter(m => m.signalStrength >= -70 && m.signalStrength < -50).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm">Svag</span>
                  </div>
                  <span className="text-sm">
                    {measurements.filter(m => m.signalStrength < -70).length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Measurements Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Målepunkter oversigt</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead>SSID</TableHead>
                  <TableHead>BSSID</TableHead>
                  <TableHead>Frekvens</TableHead>
                  <TableHead>Kanal</TableHead>
                  <TableHead>Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {measurements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Ingen målepunkter endnu. Klik på kortet for at tilføje.
                    </TableCell>
                  </TableRow>
                ) : (
                  measurements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        ({Math.round(m.x)}, {Math.round(m.y)})
                      </TableCell>
                      <TableCell className={getSignalColor(m.signalStrength)}>
                        {m.signalStrength} dBm
                      </TableCell>
                      <TableCell>{m.ssid}</TableCell>
                      <TableCell className="font-mono text-xs">{m.bssid}</TableCell>
                      <TableCell>{m.frequency} MHz</TableCell>
                      <TableCell>{m.channel}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(m)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteMeasurement(m.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Rediger målepunkt' : 'Tilføj målepunkt'}
            </DialogTitle>
            <DialogDescription>
              Indtast WiFi målingsdata for dette punkt
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Signalstyrke (dBm)</Label>
              <Input
                type="number"
                value={formData.signalStrength}
                onChange={(e) => setFormData({ ...formData, signalStrength: e.target.value })}
              />
            </div>
            <div>
              <Label>SSID</Label>
              <Input
                value={formData.ssid}
                onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                placeholder="Netværksnavn"
              />
            </div>
            <div>
              <Label>BSSID</Label>
              <Input
                value={formData.bssid}
                onChange={(e) => setFormData({ ...formData, bssid: e.target.value })}
                placeholder="00:00:00:00:00:00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Frekvens (MHz)</Label>
                <Input
                  type="number"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                />
              </div>
              <div>
                <Label>Kanal</Label>
                <Input
                  type="number"
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Noter</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Valgfri kommentarer"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuller
              </Button>
              <Button onClick={handleSaveMeasurement}>
                <Save className="mr-2 h-4 w-4" />
                Gem
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
