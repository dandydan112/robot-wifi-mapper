// WiFi Coverage Analyzer - Main Application Logic
class WiFiCoverageApp {
  constructor() {
    this.currentView = 'dashboard';
    this.projects = [];
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

  // Load projects from database with full data
  async loadProjects() {
    try {
      const basicProjects = await window.dbAPI.getAllProjects();
      
      // For each project, load complete data
      this.projects = await Promise.all(basicProjects.map(async (project) => {
        return await this.loadCompleteProjectData(project);
      }));
      
      this.updateUI();
      this.sendDataToIframes(); // Send updated projects to dashboard
    } catch (err) {
      console.error('Error loading projects from database:', err);
      this.showNotification('Fejl ved indlæsning af projekter fra database. Kontroller at backend kører.', 'error');
      this.projects = [];
    }
  }

  // Load complete data for a single project
  async loadCompleteProjectData(basicProject) {
    try {
      const [rawMeasurements, calibration, reports] = await Promise.all([
        window.dbAPI.getMeasurements(basicProject.id).catch(() => []),
        window.dbAPI.getCalibration(basicProject.id).catch(() => null),
        window.dbAPI.getReports(basicProject.id).catch(() => [])
      ]);

      // Map database measurement fields to UI format
      const measurements = (rawMeasurements || []).map(m => ({
        id: m.id,
        x: m.x_coordinate,
        y: m.y_coordinate,
        signalStrength: m.signal_strength,
        ssid: m.ssid,
        frequency: m.frequency,
        timestamp: m.timestamp
      }));

      console.log(`Loading project ${basicProject.id}:`, {
        measurements: measurements?.length || 0,
        hasCalibration: !!calibration,
        calibration: calibration
      });

      // Build floor plan object from calibration data
      let floorPlan = null;
      if (calibration && (calibration.floor_plan_image || calibration.floor_plan_file_url)) {
        const imageData = calibration.floor_plan_image || calibration.floor_plan_file_url;
        floorPlan = {
          image: imageData,              // For internal use
          imageUrl: imageData,           // For upload iframe
          scaleFactor: calibration.scale_factor || 1,
          referencePoints: calibration.reference_points || [],
          fileName: calibration.floor_plan_filename,
          fileType: calibration.floor_plan_filename?.split('.').pop() || 'unknown',
          size: calibration.floor_plan_size,
          isFileUpload: !!calibration.floor_plan_file_url
        };
      }

      // Determine project status  
      // Check if project has a status in database, otherwise infer from data
      let status = basicProject.status || 'draft';
      
      // If no status set yet, infer from data
      if (!basicProject.status) {
        if (reports?.length > 0) {
          status = 'completed'; // Has saved reports
        } else if (measurements?.length > 0) {
          status = 'draft'; // Has measurements but no report
        } else if (floorPlan) {
          status = 'draft'; // Has floor plan but no measurements
        }
      }

      // Return complete project object
      const completeProject = {
        ...basicProject,
        measurements: measurements || [],
        floorPlan: floorPlan,
        reports: reports || [],
        status: status
      };

      console.log(`Complete project ${basicProject.id}:`, completeProject);
      return completeProject;
    } catch (error) {
      console.error(`Error loading data for project ${basicProject.id}:`, error);
      // Return basic project if loading fails
      return {
        ...basicProject,
        measurements: [],
        floorPlan: null,
        reports: [],
        status: 'created'
      };
    }
  }

  // Save projects to database
  async saveProjects() {
    // Dette er nu håndteret individuelt i hver metode
    // Behøver ikke at gemme hele projektet array hver gang
    return true;
  }

  async init() {
    this.setupEventListeners();
    this.setupIframeReferences();
    await this.loadProjects(); // Load from database
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
    
    // Reload projects when going to dashboard to ensure fresh data
    if (view === 'dashboard') {
      this.loadProjects();
    }
    
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
    if (data.type === 'dashboard:delete') {
      if (data.project) {
        this.handleDeleteProject(data.project);
      } else if (data.projectId) {
        // Find project by ID and delete it
        const project = this.projects.find(p => p.id == data.projectId);
        if (project) {
          this.handleDeleteProject(project);
        }
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
    if (data.type === 'report:saved') {
      // When report is saved, mark project as completed
      if (this.currentProject) {
        this.handleReportSaved(data.project);
      }
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
  async handleCreateProject(project) {
    try {
      const newProject = await window.dbAPI.createProject(project.name, project.description);
      // Create complete project structure
      const fullProject = {
        ...project,
        id: newProject.id,
        created_at: newProject.created_at,
        updated_at: newProject.updated_at,
        measurements: [],
        floorPlan: null,
        reports: [],
        status: 'draft' // All new projects start as draft
      };
      this.projects.push(fullProject);
      this.currentProject = fullProject;
      this.setCurrentView('upload');
      this.updateUI();
      this.sendDataToIframes(); // Send to all iframes including dashboard
      this.showNotification('Projekt oprettet succesfuldt', 'success');
    } catch (error) {
      console.error('Error creating project:', error);
      this.showNotification('Fejl ved oprettelse af projekt: ' + error.message, 'error');
    }
  }

  async handleSelectProject(project) {
    console.log('Selecting project with data:', project);
    
    // Always load fresh data from database when selecting a project
    try {
      const freshProject = await this.loadCompleteProjectData(project);
      this.currentProject = freshProject;
      
      console.log('Fresh project data loaded:', freshProject);
      
      // Determine which view to show based on project data
      if (freshProject.measurements && freshProject.measurements.length > 0) {
        this.setCurrentView('heatmap'); // Has data, show heatmap
      } else if (freshProject.floorPlan) {
        this.setCurrentView('measurements'); // Has floor plan, ready for measurements
      } else {
        this.setCurrentView('upload'); // No floor plan, start with upload
      }
      
      this.updateUI();
      this.sendDataToIframes(); // Send all data to iframes
    } catch (error) {
      console.error('Error loading project data:', error);
      this.showNotification('Fejl ved indlæsning af projekt data', 'error');
    }
  }

  async handleDeleteProject(project) {
    try {
      console.log('Attempting to delete project:', project);
      
      // Confirm deletion
      if (!confirm(`Er du sikker på at du vil slette projektet "${project.name}"? Dette kan ikke fortrydes.`)) {
        return;
      }

      console.log('Deleting project from database, ID:', project.id);
      
      // Delete from database
      await window.dbAPI.deleteProject(project.id);
      
      console.log('Successfully deleted from database, updating local list');
      
      // Remove from local projects array
      this.projects = this.projects.filter(p => p.id !== project.id);
      
      // If this was the current project, clear it
      if (this.currentProject && this.currentProject.id === project.id) {
        this.currentProject = null;
        this.setCurrentView('dashboard');
      }
      
      this.updateUI();
      this.showNotification('Projekt slettet succesfuldt', 'success');
      
      console.log('Project deletion completed, remaining projects:', this.projects.length);
    } catch (error) {
      console.error('Error deleting project:', error);
      this.showNotification('Fejl ved sletning af projekt: ' + error.message, 'error');
    }
  }

  async handleFloorPlanUploaded(floorPlan) {
    if (!this.currentProject) return;
    
    try {
      // Map the property names from the upload iframe format
      let floorPlanData = floorPlan.imageUrl || floorPlan.image;
      const scaleFactor = floorPlan.scaleFactor || 1;
      const referencePoints = floorPlan.referencePoints || [];
      
      // Hvis billedet er for stort (>10MB base64), upload som fil i stedet
      if (floorPlanData && floorPlanData.length > 10 * 1024 * 1024) {
        this.showNotification('Uploadér stor fil...', 'info');
        
        // Konverter base64 til blob og upload
        const base64Data = floorPlanData.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        const file = new File([blob], 'floorplan.png', { type: 'image/png' });
        
        const uploadResult = await window.fileUploadAPI.uploadFile(file, (progress) => {
          console.log(`Upload progress: ${progress}%`);
        });
        
        floorPlanData = uploadResult.file;
        this.showNotification('Fil uploadet succesfuldt', 'success');
      }
      
      // Save calibration data to database
      console.log('Saving calibration:', {
        projectId: this.currentProject.id,
        floorPlanDataType: typeof floorPlanData,
        floorPlanDataIsObject: typeof floorPlanData === 'object',
        scaleFactor: scaleFactor,
        referencePoints: referencePoints
      });
      await window.dbAPI.saveCalibration(this.currentProject.id, floorPlanData, scaleFactor, referencePoints);
      
      const updatedProject = {
        ...this.currentProject,
        floorPlan: {
          image: floorPlanData,          // For internal use
          imageUrl: floorPlanData,       // For upload iframe
          scaleFactor: scaleFactor,
          referencePoints: referencePoints,
          fileName: floorPlan.fileName,
          fileType: floorPlan.fileType,
          width: floorPlan.width,
          height: floorPlan.height
        },
        status: 'draft', // Still draft until explicitly saved
        updatedAt: new Date()
      };
      
      this.currentProject = updatedProject;
      this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
      this.updateUI();
      this.sendDataToIframes(); // Send updated data to all iframes
      this.showNotification('Gulvplan uploadet og gemt', 'success');
    } catch (error) {
      console.error('Error saving floor plan:', error);
      this.showNotification('Fejl ved gemning af gulvplan: ' + error.message, 'error');
    }
  }

  async handleAddMeasurement(measurement) {
    if (!this.currentProject) return;
    
    try {
      // Save measurement to database
      await window.dbAPI.addMeasurement(this.currentProject.id, {
        x: measurement.x,
        y: measurement.y,
        signalStrength: measurement.signalStrength,
        ssid: measurement.ssid,
        frequency: measurement.frequency
      });
      
      const updatedProject = {
        ...this.currentProject,
        measurements: [...(this.currentProject.measurements || []), measurement],
        status: 'draft', // Still draft until explicitly saved
        updatedAt: new Date()
      };
      
      this.currentProject = updatedProject;
      this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
      this.updateUI();
      this.sendDataToIframes(); // Update dashboard
    } catch (error) {
      console.error('Error saving measurement:', error);
      this.showNotification('Fejl ved gemning af måling: ' + error.message, 'error');
    }
  }

  handleUpdateMeasurement(id, measurement) {
    if (!this.currentProject) return;
    
    // For now, just update locally - could add database update later
    const updatedProject = {
      ...this.currentProject,
      measurements: (this.currentProject.measurements || []).map(m => m.id === id ? measurement : m),
      updatedAt: new Date()
    };
    
    this.currentProject = updatedProject;
    this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    this.updateUI();
  }

  handleDeleteMeasurement(id) {
    if (!this.currentProject) return;
    
    // For now, just update locally - could add database delete later
    const updatedProject = {
      ...this.currentProject,
      measurements: (this.currentProject.measurements || []).filter(m => m.id !== id),
      updatedAt: new Date()
    };
    
    this.currentProject = updatedProject;
    this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    this.updateUI();
  }

  async handleReportSaved(reportData) {
    if (!this.currentProject) return;
    
    try {
      // Mark project as completed when report is saved
      await window.dbAPI.updateProjectStatus(this.currentProject.id, 'completed');
      
      const updatedProject = {
        ...this.currentProject,
        status: 'completed',
        updatedAt: new Date()
      };
      
      this.currentProject = updatedProject;
      this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
      this.updateUI();
      this.sendDataToIframes(); // Update dashboard
      this.showNotification('Projekt gemt succesfuldt', 'success');
    } catch (error) {
      console.error('Error updating project status:', error);
      this.showNotification('Fejl ved gemning af projektstatus: ' + error.message, 'error');
    }
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