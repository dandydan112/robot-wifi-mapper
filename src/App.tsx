import { useState, useEffect, useRef } from 'react';
import { Home, Upload, MapPin, Activity, FileText } from 'lucide-react';
// UploadCalibration is now provided as a static HTML page at /UploadCalibration.html embedded via iframe
// MeasurementPoints is now provided as a static HTML page at /MeasurementPoints.html embedded via iframe
// HeatmapView is now served as /HeatmapView.html and embedded via iframe
// ReportExport is now served from public/ReportExport.html and embedded via iframe
import { Toaster } from './components/ui/sonner';
// mock data removed; projects will start empty. Use real data or Create Project dialog to add projects.
import { Project, FloorPlan, Measurement } from './types';
import { cn } from './components/ui/utils';

type View = 'dashboard' | 'upload' | 'measurements' | 'heatmap' | 'report';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateProject = (project: Project) => {
    setProjects([...projects, project]);
    setCurrentProject(project);
    setCurrentView('upload');
  };

  const handleSelectProject = (project: Project) => {
    // Set the selected project and navigate to upload
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

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const uploadIframeRef = useRef<HTMLIFrameElement | null>(null);
    const measurementsIframeRef = useRef<HTMLIFrameElement | null>(null);
    const heatmapIframeRef = useRef<HTMLIFrameElement | null>(null);
  const createDialogIframeRef = useRef<HTMLIFrameElement | null>(null);
  const reportIframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    // Send projects to iframe whenever they change
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({ type: 'dashboard:setProjects', projects }, '*');
      } catch (err) {
        // ignore
      }
    }
  }, [projects]);

  useEffect(() => {
    // Send current floor plan to upload iframe when it changes
    const iframe = uploadIframeRef.current;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({ type: 'upload:setFloorPlan', floorPlan: currentProject?.floorPlan || null }, '*');
      } catch (err) {
        // ignore
      }
    }
    // Also send floorPlan + measurements to measurements iframe
    const mframe = measurementsIframeRef.current;
    if (mframe && mframe.contentWindow) {
      try {
        mframe.contentWindow.postMessage({ type: 'measurements:setFloorPlan', floorPlan: currentProject?.floorPlan || null }, '*');
        mframe.contentWindow.postMessage({ type: 'measurements:set', measurements: currentProject?.measurements || [] }, '*');
      } catch (err) { }
    }
    const hframe = heatmapIframeRef.current;
    if (hframe && hframe.contentWindow) {
      try {
        hframe.contentWindow.postMessage({ type: 'heatmap:setFloorPlan', floorPlan: currentProject?.floorPlan || null }, '*');
        hframe.contentWindow.postMessage({ type: 'heatmap:set', measurements: currentProject?.measurements || [] }, '*');
      } catch (err) {}
    }
  }, [currentProject?.floorPlan]);

  useEffect(() => {
    // Send measurements to measurements iframe when they change
    const mframe = measurementsIframeRef.current;
    if (mframe && mframe.contentWindow) {
      try {
        mframe.contentWindow.postMessage({ type: 'measurements:set', measurements: currentProject?.measurements || [] }, '*');
      } catch (err) { }
    }
    const hframe = heatmapIframeRef.current;
    if (hframe && hframe.contentWindow) {
      try { hframe.contentWindow.postMessage({ type: 'heatmap:set', measurements: currentProject?.measurements || [] }, '*'); } catch (err) {}
    }
  }, [currentProject?.measurements]);

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const data = ev.data || {};
      if (data && data.type === 'dashboard:create') {
        // open the create project dialog iframe
        setShowCreateDialog(true);
      }
      if (data && data.type === 'dashboard:select') {
        const p = data.project;
        if (p) handleSelectProject(p);
      }
      // Upload iframe events
      if (data && data.type === 'upload:floorPlanUploaded') {
        if (data.floorPlan) handleFloorPlanUploaded(data.floorPlan);
      }
      if (data && data.type === 'upload:next') {
        setCurrentView('measurements');
      }
      if (data && data.type === 'upload:ready') {
        // iframe asked for current data; send it
        const up = uploadIframeRef.current;
        if (up && up.contentWindow) up.contentWindow.postMessage({ type: 'upload:setFloorPlan', floorPlan: currentProject?.floorPlan || null }, '*');
      }

      // Measurements iframe events
      if (data && data.type === 'measurement:add') {
        if (data.measurement) handleAddMeasurement(data.measurement);
      }
      if (data && data.type === 'measurement:update') {
        if (data.id && data.measurement) handleUpdateMeasurement(data.id, data.measurement);
      }
      if (data && data.type === 'measurement:delete') {
        if (data.id) handleDeleteMeasurement(data.id);
      }
      if (data && data.type === 'measurements:ready') {
        const mf = measurementsIframeRef.current;
        if (mf && mf.contentWindow) {
          mf.contentWindow.postMessage({ type: 'measurements:setFloorPlan', floorPlan: currentProject?.floorPlan || null }, '*');
          mf.contentWindow.postMessage({ type: 'measurements:set', measurements: currentProject?.measurements || [] }, '*');
        }
      }
      if (data && data.type === 'heatmap:ready') {
        const hf = heatmapIframeRef.current;
        if (hf && hf.contentWindow) {
          hf.contentWindow.postMessage({ type: 'heatmap:setFloorPlan', floorPlan: currentProject?.floorPlan || null }, '*');
          hf.contentWindow.postMessage({ type: 'heatmap:set', measurements: currentProject?.measurements || [] }, '*');
        }
      }

      // Report iframe readiness
      if (data && data.type === 'report:ready') {
        const rf = reportIframeRef.current;
        if (rf && rf.contentWindow) {
          rf.contentWindow.postMessage({ type: 'report:set', project: currentProject, floorPlan: currentProject?.floorPlan || null, measurements: currentProject?.measurements || [] }, '*');
        }
      }

      // CreateProjectDialog iframe events
      if (data && data.type === 'createProject:create') {
        if (data.project) {
          handleCreateProject(data.project);
          setShowCreateDialog(false);
        }
      }
      if (data && data.type === 'createProject:cancel') {
        setShowCreateDialog(false);
      }
      if (data && data.type === 'createProject:ready') {
        // Optionally send any defaults; for now we don't have defaults to send
        const cf = createDialogIframeRef.current;
        if (cf && cf.contentWindow) {
          // send an empty set message so iframe can populate if desired
          cf.contentWindow.postMessage({ type: 'createProject:set', project: null }, '*');
        }
      }
    };
    window.addEventListener('message', handler, false);
    return () => window.removeEventListener('message', handler);
  }, [handleSelectProject]);

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
          // Embed the static HTML dashboard. Use postMessage for robust cross-window comms.
          <div className="flex-1 overflow-auto">
            <iframe
              title="Dashboard"
              src="/Dashboard.html"
              ref={iframeRef}
              style={{ width: '100%', height: '100%', border: '0', minHeight: 600 }}
            />
          </div>
        )}
        {currentView === 'upload' && currentProject && (
          <div className="flex-1 overflow-auto">
            <iframe
              title="UploadCalibration"
              src="/UploadCalibration.html"
              ref={uploadIframeRef}
              style={{ width: '100%', height: '100%', border: 0, minHeight: 600 }}
            />
          </div>
        )}
        {currentView === 'measurements' && currentProject && (
          <div className="flex-1 overflow-auto">
            <iframe
              title="MeasurementPoints"
              src="/MeasurementPoints.html"
              ref={measurementsIframeRef}
              style={{ width: '100%', height: '100%', border: 0, minHeight: 600 }}
            />
          </div>
        )}
        {currentView === 'heatmap' && currentProject && (
          <div className="flex-1 overflow-auto">
            <iframe
              title="HeatmapView"
              src="/HeatmapView.html"
              ref={heatmapIframeRef}
              style={{ width: '100%', height: '100%', border: 0, minHeight: 600 }}
            />
          </div>
        )}
        {currentView === 'report' && currentProject && (
          <div className="flex-1 overflow-auto">
            <iframe
              title="ReportExport"
              src="/ReportExport.html"
              ref={reportIframeRef}
              style={{ width: '100%', height: '100%', border: 0, minHeight: 600 }}
            />
          </div>
        )}
      </main>

      {/* Create Project Dialog (now an iframe) */}
      {showCreateDialog && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 9999 }}>
          <div style={{ width: 'min(900px, 96%)', maxHeight: '90vh', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <iframe
              title="CreateProjectDialog"
              src="/CreateProjectDialog.html"
              ref={createDialogIframeRef}
              style={{ width: '100%', height: '100%', border: 0, minHeight: 360 }}
            />
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
