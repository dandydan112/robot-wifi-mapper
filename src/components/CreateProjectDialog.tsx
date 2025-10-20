import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Project } from '../types';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (project: Project) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreateProject
}: CreateProjectDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    building: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newProject: Project = {
      id: `p-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      building: formData.building,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      measurements: []
    };

    onCreateProject(newProject);
    onOpenChange(false);
    setFormData({ name: '', description: '', building: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Opret nyt projekt</DialogTitle>
          <DialogDescription>
            Indtast projektinformation for at komme i gang
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Projektnavn *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="f.eks. Kontorhus København"
            />
          </div>
          <div>
            <Label htmlFor="building">Bygning *</Label>
            <Input
              id="building"
              value={formData.building}
              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              required
              placeholder="f.eks. Hovedkontor"
            />
          </div>
          <div>
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Kort beskrivelse af projektet..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuller
            </Button>
            <Button type="submit">
              Opret projekt
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
