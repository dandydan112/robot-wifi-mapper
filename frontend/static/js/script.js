// WiFi Coverage Analyzer - Main Application Logic
class WiFiCoverageApp {
  constructor() {
    this.currentView = 'dashboard';
    this.projects = this.loadProjects();
    this.currentProject = null;
    this.showCreateDialog = false;
    
    // Initialize references to iframes
    this.iframes = {
      dashboard: null,
      upload: null,
      measurements: null,
      heatmap: null,
      report: null,
      createDialog: null
    };
    
    this.init();
  }

  // Load projects from localStorage
  loadProjects() {
    try {
      const saved = localStorage.getItem('wifi-projects');
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error('Error loading projects:', err);
      return [];
    }
  }

  // Save projects to localStorage
  saveProjects() {
    try {
      localStorage.setItem('wifi-projects', JSON.stringify(this.projects));
    } catch (err) {
      console.error('Error saving projects:', err);
    }
  }

  init() {
    this.setupEventListeners();
    this.setupIframeReferences();
    this.updateUI();
    
    // Show getting started guide if no projects exist
    if (this.projects.length === 0) {
      setTimeout(() => {
        this.showNotification('Velkommen! Klik på "Opret nyt projekt" for at komme i gang.', 'info');
      }, 1000);
    }
  }

  setupEventListeners() {
    // Navigation buttons
    document.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        if (!e.currentTarget.disabled) {
          this.setCurrentView(view);
        }
      });
    });

    // PostMessage handler for iframe communication
    window.addEventListener('message', (ev) => {
      this.handleMessage(ev);
    }, false);
  }

  setupIframeReferences() {
    this.iframes.dashboard = document.getElementById('dashboard-iframe');
    this.iframes.upload = document.getElementById('upload-iframe');
    this.iframes.measurements = document.getElementById('measurements-iframe');
    this.iframes.heatmap = document.getElementById('heatmap-iframe');
    this.iframes.report = document.getElementById('report-iframe');
    this.iframes.createDialog = document.getElementById('create-dialog-iframe');
  }

  setCurrentView(view) {
    this.currentView = view;
    this.updateUI();
  }

  updateUI() {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(button => {
      const view = button.getAttribute('data-view');
      button.classList.toggle('active', view === this.currentView);
    });

    // Update views
    document.querySelectorAll('.view').forEach(viewEl => {
      const view = viewEl.id.replace('view-', '');
      viewEl.classList.toggle('active', view === this.currentView);
    });

    // Update navigation states
    this.updateNavigationStates();

    // Update project name display
    const projectNameEl = document.getElementById('project-name');
    if (this.currentProject) {
      projectNameEl.textContent = this.currentProject.name;
      projectNameEl.classList.remove('hidden');
    } else {
      projectNameEl.classList.add('hidden');
    }

    // Send data to active iframe
    this.sendDataToIframes();
  }

  updateNavigationStates() {
    const navUpload = document.getElementById('nav-upload');
    const navMeasurements = document.getElementById('nav-measurements');
    const navHeatmap = document.getElementById('nav-heatmap');
    const navReport = document.getElementById('nav-report');

    // Clear all completed states first
    [navUpload, navMeasurements, navHeatmap, navReport].forEach(nav => {
      nav.classList.remove('completed');
    });

    navUpload.disabled = !this.currentProject;
    navMeasurements.disabled = !this.canNavigateToMeasurements();
    navHeatmap.disabled = !this.canNavigateToMeasurements();
    navReport.disabled = !this.currentProject;

    // Add visual indicators for completed steps
    if (this.currentProject) {
      if (this.currentProject.floorPlan) {
        navUpload.classList.add('completed');
        if (this.currentProject.measurements && this.currentProject.measurements.length > 0) {
          navMeasurements.classList.add('completed');
          if (this.currentProject.measurements.length >= 3) {
            navHeatmap.classList.add('completed');
            navReport.classList.add('completed');
          }
        }
      }
    }
  }

  sendDataToIframes() {
    // Send projects to dashboard
    if (this.iframes.dashboard && this.iframes.dashboard.contentWindow) {
      try {
        this.iframes.dashboard.contentWindow.postMessage({
          type: 'dashboard:setProjects',
          projects: this.projects
        }, '*');
      } catch (err) {
        // ignore
      }
    }

    // Send floor plan to upload iframe
    if (this.iframes.upload && this.iframes.upload.contentWindow) {
      try {
        this.iframes.upload.contentWindow.postMessage({
          type: 'upload:setFloorPlan',
          floorPlan: this.currentProject?.floorPlan || null
        }, '*');
      } catch (err) {
        // ignore
      }
    }

    // Send data to measurements iframe
    if (this.iframes.measurements && this.iframes.measurements.contentWindow) {
      try {
        this.iframes.measurements.contentWindow.postMessage({
          type: 'measurements:setFloorPlan',
          floorPlan: this.currentProject?.floorPlan || null
        }, '*');
        this.iframes.measurements.contentWindow.postMessage({
          type: 'measurements:set',
          measurements: this.currentProject?.measurements || []
        }, '*');
      } catch (err) {
        // ignore
      }
    }

    // Send data to heatmap iframe
    if (this.iframes.heatmap && this.iframes.heatmap.contentWindow) {
      try {
        this.iframes.heatmap.contentWindow.postMessage({
          type: 'heatmap:setFloorPlan',
          floorPlan: this.currentProject?.floorPlan || null
        }, '*');
        this.iframes.heatmap.contentWindow.postMessage({
          type: 'heatmap:set',
          measurements: this.currentProject?.measurements || []
        }, '*');
      } catch (err) {
        // ignore
      }
    }

    // Send data to report iframe
    if (this.iframes.report && this.iframes.report.contentWindow) {
      try {
        this.iframes.report.contentWindow.postMessage({
          type: 'report:set',
          project: this.currentProject,
          floorPlan: this.currentProject?.floorPlan || null,
          measurements: this.currentProject?.measurements || []
        }, '*');
      } catch (err) {
        // ignore
      }
    }
  }

  handleMessage(ev) {
    const data = ev.data || {};
    
    // Debug logging
    if (data.type) {
      console.log('Received message:', data.type, data);
    }

    // Dashboard events
    if (data.type === 'dashboard:create') {
      this.showCreateProjectDialog();
    }
    if (data.type === 'dashboard:select') {
      if (data.project) {
        this.handleSelectProject(data.project);
      }
    }

    // Upload events
    if (data.type === 'upload:floorPlanUploaded') {
      if (data.floorPlan) {
        this.handleFloorPlanUploaded(data.floorPlan);
        // Show notification that floor plan was uploaded
        this.showNotification('Plantegning uploadet! Du kan nu begynde at tilføje målepunkter.', 'success');
      }
    }
    if (data.type === 'upload:next') {
      this.setCurrentView('measurements');
      this.showNotification('Du kan nu klikke på kortet for at tilføje målepunkter.', 'info');
    }
    if (data.type === 'upload:ready') {
      this.sendDataToIframes();
    }

    // Measurement events
    if (data.type === 'measurement:add') {
      if (data.measurement) {
        this.handleAddMeasurement(data.measurement);
        const count = this.currentProject?.measurements?.length || 0;
        if (count === 1) {
          this.showNotification('Første målepunkt tilføjet! Tilføj flere for bedre dækning.', 'success');
        } else if (count === 5) {
          this.showNotification('5 målepunkter tilføjet! Du kan nu generere et heatmap.', 'success');
        } else if (count >= 10) {
          this.showNotification('Fremragende! Du har nu god data til analyse.', 'success');
        }
      }
    }
    if (data.type === 'measurement:update') {
      if (data.id && data.measurement) {
        this.handleUpdateMeasurement(data.id, data.measurement);
        this.showNotification('Målepunkt opdateret.', 'info');
      }
    }
    if (data.type === 'measurement:delete') {
      if (data.id) {
        this.handleDeleteMeasurement(data.id);
        this.showNotification('Målepunkt slettet.', 'info');
      }
    }
    if (data.type === 'measurements:ready') {
      this.sendDataToIframes();
    }

    // Heatmap events
    if (data.type === 'heatmap:ready') {
      this.sendDataToIframes();
    }

    // Report events
    if (data.type === 'report:ready') {
      this.sendDataToIframes();
    }

    // Create project dialog events
    if (data.type === 'createProject:create') {
      if (data.project) {
        this.handleCreateProject(data.project);
        this.hideCreateProjectDialog();
      }
    }
    if (data.type === 'createProject:cancel') {
      this.hideCreateProjectDialog();
    }
    if (data.type === 'createProject:ready') {
      // Send empty data to create dialog
      if (this.iframes.createDialog && this.iframes.createDialog.contentWindow) {
        this.iframes.createDialog.contentWindow.postMessage({
          type: 'createProject:set',
          project: null
        }, '*');
      }
    }
  }

  // Project management methods
  handleCreateProject(project) {
    this.projects.push(project);
    this.currentProject = project;
    this.saveProjects();
    this.setCurrentView('upload');
    this.updateUI();
  }

  handleSelectProject(project) {
    this.currentProject = project;
    this.setCurrentView('upload');
    this.updateUI();
  }

  handleFloorPlanUploaded(floorPlan) {
    if (!this.currentProject) return;
    
    const updatedProject = {
      ...this.currentProject,
      floorPlan,
      status: 'measuring',
      updatedAt: new Date()
    };
    
    this.currentProject = updatedProject;
    this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    this.saveProjects();
    this.updateUI();
  }

  handleAddMeasurement(measurement) {
    if (!this.currentProject) return;
    
    const updatedProject = {
      ...this.currentProject,
      measurements: [...(this.currentProject.measurements || []), measurement],
      updatedAt: new Date()
    };
    
    this.currentProject = updatedProject;
    this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    this.saveProjects();
    this.updateUI();
  }

  handleUpdateMeasurement(id, measurement) {
    if (!this.currentProject) return;
    
    const updatedProject = {
      ...this.currentProject,
      measurements: (this.currentProject.measurements || []).map(m => m.id === id ? measurement : m),
      updatedAt: new Date()
    };
    
    this.currentProject = updatedProject;
    this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    this.saveProjects();
    this.updateUI();
  }

  handleDeleteMeasurement(id) {
    if (!this.currentProject) return;
    
    const updatedProject = {
      ...this.currentProject,
      measurements: (this.currentProject.measurements || []).filter(m => m.id !== id),
      updatedAt: new Date()
    };
    
    this.currentProject = updatedProject;
    this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    this.saveProjects();
    this.updateUI();
  }

  // Dialog management
  showCreateProjectDialog() {
    const dialog = document.getElementById('create-dialog');
    dialog.classList.remove('hidden');
    this.showCreateDialog = true;
  }

  hideCreateProjectDialog() {
    const dialog = document.getElementById('create-dialog');
    dialog.classList.add('hidden');
    this.showCreateDialog = false;
  }

  // Notification system
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  // Navigation flow helpers
  canNavigateToMeasurements() {
    return this.currentProject && this.currentProject.floorPlan;
  }

  canNavigateToHeatmap() {
    return this.currentProject && this.currentProject.floorPlan && 
           this.currentProject.measurements && this.currentProject.measurements.length > 0;
  }

  // Auto-suggest next step
  suggestNextStep() {
    if (!this.currentProject) {
      this.showNotification('Opret et projekt for at komme i gang.', 'info');
      return;
    }
    
    if (!this.currentProject.floorPlan) {
      this.showNotification('Upload en plantegning for at fortsætte.', 'info');
      this.setCurrentView('upload');
      return;
    }
    
    if (!this.currentProject.measurements || this.currentProject.measurements.length === 0) {
      this.showNotification('Tilføj målepunkter ved at klikke på kortet.', 'info');
      this.setCurrentView('measurements');
      return;
    }
    
    if (this.currentProject.measurements.length >= 3) {
      this.showNotification('Du har nok målepunkter til at generere et heatmap!', 'success');
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.wifiApp = new WiFiCoverageApp();
});