import { useState } from 'react';
import { Home, Upload, MapPin, Activity, FileText } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { UploadCalibration } from './components/UploadCalibration';
import { MeasurementPoints } from './components/MeasurementPoints';
import { HeatmapView } from './components/HeatmapView';
import { ReportExport } from './components/ReportExport';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import { Toaster } from './components/ui/sonner';
import { mockProjects, generateSampleMeasurements } from './lib/mockData';
import { Project, FloorPlan, Measurement } from './types';
import { cn } from './components/ui/utils';

type View = 'dashboard' | 'upload' | 'measurements' | 'heatmap' | 'report';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateProject = (project: Project) => {
    setProjects([...projects, project]);
    setCurrentProject(project);
    setCurrentView('upload');
  };

  const handleSelectProject = (project: Project) => {
    // Add sample measurements for demo if completed or measuring
    if (project.status !== 'draft' && project.measurements.length === 0) {
      project.measurements = generateSampleMeasurements(30);
    }
    setCurrentProject(project);
    setCurrentView('upload');
  };

  const handleFloorPlanUploaded = (floorPlan: FloorPlan) => {
    if (!currentProject) return;
    const updatedProject = { ...currentProject, floorPlan, status: 'measuring' as const, updatedAt: new Date() };
    setCurrentProject(updatedProject);
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleAddMeasurement = (measurement: Measurement) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      measurements: [...currentProject.measurements, measurement],
      updatedAt: new Date()
    };
    setCurrentProject(updatedProject);
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleUpdateMeasurement = (id: string, measurement: Measurement) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      measurements: currentProject.measurements.map(m => m.id === id ? measurement : m),
      updatedAt: new Date()
    };
    setCurrentProject(updatedProject);
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleDeleteMeasurement = (id: string) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      measurements: currentProject.measurements.filter(m => m.id !== id),
      updatedAt: new Date()
    };
    setCurrentProject(updatedProject);
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const navigationItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: Home },
    { id: 'upload' as View, label: 'Upload & Kalibrering', icon: Upload, disabled: !currentProject },
    { id: 'measurements' as View, label: 'Målepunkter', icon: MapPin, disabled: !currentProject?.floorPlan },
    { id: 'heatmap' as View, label: 'Heatmap', icon: Activity, disabled: !currentProject?.floorPlan },
    { id: 'report' as View, label: 'Rapport & Eksport', icon: FileText, disabled: !currentProject },
  ];

  return (
    <div className="size-full flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg">WiFi Coverage Analyzer</h1>
                {currentProject && (
                  <p className="text-xs text-muted-foreground">{currentProject.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Navigation */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => !item.disabled && setCurrentView(item.id)}
                  disabled={item.disabled}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap',
                    currentView === item.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                    item.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'dashboard' && (
          <Dashboard
            projects={projects}
            onCreateProject={() => setShowCreateDialog(true)}
            onSelectProject={handleSelectProject}
          />
        )}
        {currentView === 'upload' && currentProject && (
          <UploadCalibration
            onFloorPlanUploaded={handleFloorPlanUploaded}
            onNext={() => setCurrentView('measurements')}
            currentFloorPlan={currentProject.floorPlan}
          />
        )}
        {currentView === 'measurements' && currentProject && (
          <MeasurementPoints
            floorPlan={currentProject.floorPlan}
            measurements={currentProject.measurements}
            onAddMeasurement={handleAddMeasurement}
            onUpdateMeasurement={handleUpdateMeasurement}
            onDeleteMeasurement={handleDeleteMeasurement}
          />
        )}
        {currentView === 'heatmap' && currentProject && (
          <HeatmapView
            floorPlan={currentProject.floorPlan}
            measurements={currentProject.measurements}
          />
        )}
        {currentView === 'report' && currentProject && (
          <ReportExport
            project={currentProject}
            floorPlan={currentProject.floorPlan}
            measurements={currentProject.measurements}
          />
        )}
      </main>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateProject={handleCreateProject}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
