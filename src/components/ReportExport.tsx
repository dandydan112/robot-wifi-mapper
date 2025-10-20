import { useState } from 'react';
import { Download, FileText, Image as ImageIcon, FileJson } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { FloorPlan, Measurement, Project } from '../types';

interface ReportExportProps {
  project: Project;
  floorPlan?: FloorPlan;
  measurements: Measurement[];
}

export function ReportExport({ project, floorPlan, measurements }: ReportExportProps) {
  const [comments, setComments] = useState('');

  const calculateStats = () => {
    if (measurements.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        excellent: 0,
        good: 0,
        poor: 0,
        uniqueSSIDs: 0,
        uniqueBSSIDs: 0
      };
    }

    const signalStrengths = measurements.map(m => m.signalStrength);
    return {
      total: measurements.length,
      average: Math.round(signalStrengths.reduce((a, b) => a + b, 0) / measurements.length),
      min: Math.min(...signalStrengths),
      max: Math.max(...signalStrengths),
      excellent: measurements.filter(m => m.signalStrength >= -50).length,
      good: measurements.filter(m => m.signalStrength >= -70 && m.signalStrength < -50).length,
      poor: measurements.filter(m => m.signalStrength < -70).length,
      uniqueSSIDs: new Set(measurements.map(m => m.ssid)).size,
      uniqueBSSIDs: new Set(measurements.map(m => m.bssid)).size
    };
  };

  const stats = calculateStats();

  const handleExportPDF = () => {
    // Mock PDF export
    alert('PDF eksport ville blive genereret her. Denne funktion kræver en backend service.');
  };

  const handleExportPNG = () => {
    // Mock PNG export
    alert('PNG eksport ville blive genereret her. Download heatmap som billede.');
  };

  const handleExportJSON = () => {
    const data = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        building: project.building,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        status: project.status
      },
      floorPlan,
      measurements,
      comments,
      stats,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-')}-report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="mb-2">Rapport & Eksport</h1>
          <p className="text-muted-foreground">
            Generer rapport og eksporter data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Summary */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Projekt oversigt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Projektnavn</div>
                    <div>{project.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Bygning</div>
                    <div>{project.building}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="capitalize">{project.status}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Opdateret</div>
                    <div>{project.updatedAt.toLocaleDateString('da-DK')}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Beskrivelse</div>
                  <div>{project.description}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nøgletal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Totale målinger</div>
                    <div className="text-3xl">{stats.total}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Gennemsnit</div>
                    <div className="text-3xl">{stats.average} dBm</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Minimum</div>
                    <div className="text-3xl">{stats.min} dBm</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Maksimum</div>
                    <div className="text-3xl">{stats.max} dBm</div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h3>Dækningskvalitet</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-600"></div>
                        <span>Fremragende (-35 til -50 dBm)</span>
                      </div>
                      <span>
                        {stats.excellent} ({stats.total > 0 ? Math.round((stats.excellent / stats.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-yellow-500"></div>
                        <span>God (-51 til -70 dBm)</span>
                      </div>
                      <span>
                        {stats.good} ({stats.total > 0 ? Math.round((stats.good / stats.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500"></div>
                        <span>Svag (-71 til -85 dBm)</span>
                      </div>
                      <span>
                        {stats.poor} ({stats.total > 0 ? Math.round((stats.poor / stats.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Unikke SSIDs</div>
                    <div className="text-2xl">{stats.uniqueSSIDs}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Unikke BSSIDs</div>
                    <div className="text-2xl">{stats.uniqueBSSIDs}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kommentarer & Noter</CardTitle>
                <CardDescription>
                  Tilføj yderligere information til rapporten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Indtast kommentarer, observationer eller anbefalinger..."
                  rows={6}
                />
              </CardContent>
            </Card>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Eksporter rapport</CardTitle>
                <CardDescription>
                  Download data i forskellige formater
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleExportPDF}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Eksporter som PDF
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleExportPNG}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Eksporter som PNG
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleExportJSON}
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  Eksporter som JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anbefalinger</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {stats.poor > stats.total * 0.3 ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="text-red-700 dark:text-red-400">
                      ⚠️ Højt antal svage signaler ({Math.round((stats.poor / stats.total) * 100)}%)
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      Overvej at tilføje flere access points
                    </div>
                  </div>
                ) : stats.excellent > stats.total * 0.7 ? (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="text-green-700 dark:text-green-400">
                      ✓ Fremragende dækning ({Math.round((stats.excellent / stats.total) * 100)}%)
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      WiFi-netværket fungerer optimalt
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="text-yellow-700 dark:text-yellow-400">
                      ℹ️ Acceptabel dækning
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      Mindre justeringer kan forbedre signalet
                    </div>
                  </div>
                )}

                {stats.uniqueBSSIDs > 5 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-700 dark:text-blue-400">
                    Mange access points detekteret. Sørg for optimal kanalfordeling.
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
