import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, FileType, Check, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FloorPlan } from '../types';
import { toast } from 'sonner@2.0.3';

interface UploadCalibrationProps {
  onFloorPlanUploaded: (floorPlan: FloorPlan) => void;
  onNext?: () => void;
  currentFloorPlan?: FloorPlan;
}

export function UploadCalibration({ onFloorPlanUploaded, onNext, currentFloorPlan }: UploadCalibrationProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentFloorPlan?.imageUrl || null);
  const [fileName, setFileName] = useState<string>(currentFloorPlan?.fileName || '');
  const [scale, setScale] = useState<string>(currentFloorPlan?.scale?.pixelsPerMeter.toString() || '100');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreviewUrl(url);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!previewUrl) return;

    const floorPlan: FloorPlan = {
      id: currentFloorPlan?.id || `fp-${Date.now()}`,
      fileName,
      fileType: fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 
                fileName.toLowerCase().endsWith('.svg') ? 'svg' : 'png',
      imageUrl: previewUrl,
      width: 1000,
      height: 700,
      scale: {
        pixelsPerMeter: parseFloat(scale),
        referencePoints: []
      }
    };

    onFloorPlanUploaded(floorPlan);
    toast.success('Plantegning gemt!', {
      description: 'Du kan nu tilføje målepunkter på kortet.'
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="mb-2">Upload & Kalibrering</h1>
          <p className="text-muted-foreground">
            Upload plantegning og definer målestok
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload plantegning</CardTitle>
              <CardDescription>
                Understøttede formater: PDF, PNG, SVG, JPG
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.svg,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full h-32 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span>Klik for at vælge fil</span>
                    <span className="text-xs text-muted-foreground">
                      eller træk og slip her
                    </span>
                  </div>
                </Button>
              </div>

              {fileName && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileType className="h-4 w-4" />
                  <span className="text-sm flex-1 truncate">{fileName}</span>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="scale">Målestok (pixels pr. meter)</Label>
                <Input
                  id="scale"
                  type="number"
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                  placeholder="100"
                />
                <p className="text-xs text-muted-foreground">
                  Definer hvor mange pixels der svarer til 1 meter i virkeligheden
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  disabled={!previewUrl}
                >
                  Gem plantegning
                </Button>
                {currentFloorPlan && onNext && (
                  <Button
                    onClick={onNext}
                    className="flex-1"
                    variant="default"
                  >
                    Næste: Målepunkter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Forhåndsvisning af uploadet plantegning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewUrl ? (
                <div className="border rounded-lg overflow-hidden bg-muted">
                  <img
                    src={previewUrl}
                    alt="Floor plan preview"
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="border border-dashed rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Ingen plantegning uploadet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Calibration Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Kalibreringsvejledning</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Upload en klar plantegning af bygningen</li>
              <li>Identificer en kendt distance på plantegningen (f.eks. en væg)</li>
              <li>Mål længden i pixels og den faktiske længde i meter</li>
              <li>Beregn målestoksforholdet (pixels / meter)</li>
              <li>Indtast værdien i feltet ovenfor</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
