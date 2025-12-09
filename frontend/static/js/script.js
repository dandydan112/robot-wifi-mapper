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
      const floorPlans = await window.dbAPI.getAllProjects();

      const enriched = await Promise.all((floorPlans || []).map(fp => this.loadCompleteProjectData(fp)));
      this.projects = enriched;

      this.updateUI();
      this.sendDataToIframes();
    } catch (err) {
      console.error('Error loading projects from database:', err);
      this.showNotification('Fejl ved indlæsning af projekter fra database. Kontroller at backend kører.', 'error');
      this.projects = [];
    }
  }

  // Load complete data for a single project
  async loadCompleteProjectData(basicProject) {
    try {
      const floorPlanId = basicProject?.id || basicProject?.FloorPlanId;
      if (!floorPlanId) {
        throw new Error('Floor plan id mangler');
      }

      let measurementPoints = [];
      try {
        measurementPoints = await window.dbAPI.getMeasurementPoints(floorPlanId);
      } catch (err) {
        console.error('Error fetching measurement points:', err);
      }

      const measurements = (measurementPoints || []).flatMap(point => {
        if (Array.isArray(point.readings) && point.readings.length > 0) {
          return point.readings.map((reading, idx) => ({
            id: `${point.id}-reading-${idx}`,
            measurementPointId: point.id,
            x: point.x,
            y: point.y,
            signalStrength: reading.rssi || reading.signal_level || null,
            ssid: reading.ssid || '<redacted>',
            bssid: reading.bssid || reading.mac || '',
            frequency: reading.frequency || null,
            channel: reading.channel || null,
            timestamp: point.updatedAt || point.createdAt,
            scanStatus: point.scan_status || point.scanStatus || 'done'
          }));
        }

        return [{
          id: `${point.id}-pending`,
          measurementPointId: point.id,
          x: point.x,
          y: point.y,
          signalStrength: null,
          ssid: point.name || '<redacted>',
          bssid: null,
          frequency: null,
          channel: null,
          timestamp: point.updatedAt || point.createdAt,
          scanStatus: point.scan_status || point.scanStatus || 'pending'
        }];
      });

      const floorPlan = this.buildFloorPlanObject(basicProject);
      const status = this.determineProjectStatus(floorPlan, measurements, basicProject?.status);

      return {
        id: floorPlanId,
        name: basicProject?.name || basicProject?.Name || 'Uden navn',
        building: basicProject?.building || basicProject?.Building || '',
        description: basicProject?.description || basicProject?.Description || '',
        status,
        createdAt: basicProject?.createdAt || basicProject?.CreationDate || new Date().toISOString(),
        updatedAt: basicProject?.updatedAt || basicProject?.UpdatedAt || basicProject?.CreationDate || new Date().toISOString(),
        measurements,
        floorPlan,
        reports: basicProject?.reports || []
      };
    } catch (err) {
      const fallbackId = basicProject?.id || basicProject?.FloorPlanId || 'unknown';
      console.error(`Error loading complete data for project ${fallbackId}:`, err);
      return {
        id: basicProject?.id || basicProject?.FloorPlanId,
        name: basicProject?.name || basicProject?.Name || 'Uden navn',
        building: basicProject?.building || '',
        description: basicProject?.description || '',
        status: 'draft',
        createdAt: basicProject?.createdAt || basicProject?.CreationDate || new Date().toISOString(),
        updatedAt: basicProject?.updatedAt || basicProject?.CreationDate || new Date().toISOString(),
        measurements: [],
        floorPlan: null,
        reports: []
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
    
    // Re-send data to the newly active view to ensure it's up to date
    // Small delay to ensure iframe is ready
    setTimeout(() => {
      this.sendDataToIframes();
    }, 100);
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
        const fpToSend = this.currentProject?.floorPlan || null;
        console.log('[Main] Sending floor plan to upload iframe:', fpToSend);
        this.iframes.upload.contentWindow.postMessage({
          type: 'upload:setFloorPlan',
          floorPlan: fpToSend
        }, '*');
      } catch (err) {
        console.error('[Main] Error sending to upload iframe:', err);
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
        const fpData = this.currentProject?.floorPlan || null;
        console.log('[Main] Sending floor plan to heatmap iframe:', fpData);
        console.log('[Main] Current project:', this.currentProject);
        
        // Always send floor plan first, then measurements
        this.iframes.heatmap.contentWindow.postMessage({
          type: 'heatmap:setFloorPlan',
          floorPlan: fpData
        }, '*');
        
        // Small delay to ensure floor plan is processed first
        setTimeout(() => {
          if (this.iframes.heatmap && this.iframes.heatmap.contentWindow) {
            this.iframes.heatmap.contentWindow.postMessage({
              type: 'heatmap:set',
              measurements: this.currentProject?.measurements || [],
              project: this.currentProject
            }, '*');
          }
        }, 100);
      } catch (err) {
        console.error('[Main] Error sending to heatmap iframe:', err);
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
      console.log('[Main] Heatmap iframe is ready, sending data');
      // Delay to ensure iframe is fully initialized
      setTimeout(() => {
        if (this.iframes.heatmap && this.iframes.heatmap.contentWindow) {
          const fpData = this.currentProject?.floorPlan || null;
          console.log('[Main] Sending floor plan to ready heatmap:', fpData);
          
          this.iframes.heatmap.contentWindow.postMessage({
            type: 'heatmap:setFloorPlan',
            floorPlan: fpData
          }, '*');
          
          setTimeout(() => {
            if (this.iframes.heatmap && this.iframes.heatmap.contentWindow) {
                this.iframes.heatmap.contentWindow.postMessage({
                type: 'heatmap:set',
                measurements: this.currentProject?.measurements || [],
                project: this.currentProject
              }, '*');
            }
          }, 50);
        }
      }, 100);
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
      const created = await window.dbAPI.createProject(project);
      const fullProject = await this.loadCompleteProjectData(created);

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
      this.projects = this.projects.map(p => p.id === freshProject.id ? freshProject : p);
      
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
      const details = {
        imagePath: floorPlan.imageUrl || floorPlan.imagePath || null,
        imageOriginalName: floorPlan.fileName || null,
        imageMimeType: floorPlan.fileType || null,
        imageWidth: floorPlan.width || null,
        imageHeight: floorPlan.height || null,
        scaleFactor: floorPlan.scaleFactor || null,
        referencePoints: floorPlan.referencePoints || []
      };

      const updatedRecord = await window.dbAPI.updateFloorPlanDetails(this.currentProject.id, details);
      console.log('[Main] Updated floor plan record from backend:', updatedRecord);
      const floorPlanObject = this.buildFloorPlanObject(updatedRecord);
      console.log('[Main] Built floor plan object:', floorPlanObject);

      const updatedProject = {
        ...this.currentProject,
        floorPlan: floorPlanObject,
        status: this.determineProjectStatus(floorPlanObject, this.currentProject.measurements || [], this.currentProject.status),
        updatedAt: updatedRecord?.updatedAt || new Date().toISOString()
      };

      this.currentProject = updatedProject;
      this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
      this.updateUI();
      this.sendDataToIframes();
      this.showNotification('Gulvplan uploadet og gemt', 'success');
    } catch (error) {
      console.error('Error saving floor plan:', error);
      this.showNotification('Fejl ved gemning af gulvplan: ' + error.message, 'error');
    }
  }

  async handleAddMeasurement(measurement) {
    if (!this.currentProject) return;
    try {
      const url = '/api/measurement-points';
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: measurement.x,
          y: measurement.y,
          name: measurement.ssid || measurement.name || null,
          floorPlanId: this.currentProject.id
        })
      });

      if (!resp.ok) throw new Error('Backend rejected measurement');
      const mp = await resp.json();

      const pending = {
        id: mp.id,
        measurementPointId: mp.id,
        x: mp.x,
        y: mp.y,
        signalStrength: null,
        ssid: mp.name || '',
        bssid: null,
        timestamp: mp.createdAt,
        scanStatus: mp.scan_status || 'pending'
      };

      this.currentProject = {
        ...this.currentProject,
        measurements: [...(this.currentProject.measurements || []), pending],
        updatedAt: new Date().toISOString()
      };
      this.projects = this.projects.map(p => p.id === this.currentProject.id ? this.currentProject : p);
      this.updateUI();

      const pollUrl = `${url}/${mp.id}`;
      let attempts = 0;
      while (attempts < 40) {
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
        try {
          const st = await fetch(pollUrl);
          if (!st.ok) continue;
          const latest = await st.json();
          if (latest.scan_status === 'done' || latest.scan_status === 'failed') {
            // In new schema, all readings are stored under the single measurement point
            // Convert readings to measurements format for display
            if (Array.isArray(latest.readings) && latest.readings.length > 0) {
              const measurements = latest.readings.map((reading, idx) => ({
                id: `${latest.id}-reading-${idx}`,
                x: latest.x,
                y: latest.y,
                signalStrength: reading.rssi || reading.signal_level || null,
                ssid: reading.ssid || '<redacted>',
                bssid: reading.bssid || reading.mac || '',
                frequency: reading.frequency || null,
                channel: reading.channel || null,
                timestamp: latest.updatedAt || latest.createdAt
              }));
              // Remove the pending placeholder and add all readings as separate visual points
              this.currentProject = {
                ...this.currentProject,
                measurements: [
                  ...(this.currentProject.measurements || []).filter(m => m.measurementPointId !== mp.id && m.id !== mp.id),
                  ...measurements
                ],
                updatedAt: new Date().toISOString()
              };
              this.projects = this.projects.map(p => p.id === this.currentProject.id ? this.currentProject : p);
              this.updateUI();
              this.sendDataToIframes();
            }
            break;
          }
        } catch (e) {
          // network error; keep polling
        }
      }
    } catch (err) {
      console.error('Error creating measurement point:', err);
      this.showNotification('Fejl ved oprettelse af målepunkt: ' + err.message, 'error');
    }
  }

  handleUpdateMeasurement(id, measurement) {
    if (!this.currentProject) return;
    
    // For now, just update locally - could add database update later
    const updatedProject = {
      ...this.currentProject,
      measurements: (this.currentProject.measurements || []).map(m => m.id === id ? measurement : m),
      updatedAt: new Date().toISOString()
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
      updatedAt: new Date().toISOString()
    };
    
    this.currentProject = updatedProject;
    this.projects = this.projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    this.updateUI();
  }

  async handleReportSaved(reportData) {
    if (!this.currentProject) return;
    
    try {
      const updatedProject = {
        ...this.currentProject,
        status: 'completed',
        updatedAt: new Date().toISOString()
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

  buildFloorPlanObject(source) {
    if (!source) {
      console.warn('[Main] buildFloorPlanObject: source is null/undefined');
      return null;
    }
    console.log('[Main] buildFloorPlanObject source:', source);
    console.log('[Main] buildFloorPlanObject source keys:', Object.keys(source));
    const imagePath = source.imagePath || source.imageUrl || null;
    console.log('[Main] buildFloorPlanObject imagePath:', imagePath);
    console.log('[Main] buildFloorPlanObject source.imagePath:', source.imagePath);
    console.log('[Main] buildFloorPlanObject source.imageUrl:', source.imageUrl);
    if (!imagePath) {
      console.warn('[Main] buildFloorPlanObject: No imagePath found, returning null');
      console.warn('[Main] Available fields in source:', Object.keys(source));
      return null;
    }

    const referencePoints = Array.isArray(source.referencePoints)
      ? source.referencePoints
      : (source.scale && Array.isArray(source.scale.referencePoints) ? source.scale.referencePoints : []);

    const scaleFactor = source.scaleFactor || (source.scale && source.scale.pixelsPerMeter) || null;

    const floorPlan = {
      imageUrl: imagePath,
      imagePath: imagePath,
      fileName: source.imageOriginalName || source.fileName || null,
      fileType: source.imageMimeType || source.fileType || null,
      width: source.imageWidth || source.width || null,
      height: source.imageHeight || source.height || null,
      scaleFactor,
      referencePoints
    };

    if (scaleFactor) {
      floorPlan.scale = { pixelsPerMeter: scaleFactor, referencePoints };
    }

    return floorPlan;
  }

  determineProjectStatus(floorPlan, measurements, baseStatus) {
    if (baseStatus && typeof baseStatus === 'string') {
      return baseStatus;
    }

    if (floorPlan && measurements && measurements.length > 0) {
      const completedMeasurements = measurements.filter(m => m.signalStrength !== null);
      if (completedMeasurements.length >= 3) {
        return 'measuring';
      }
      return 'calibrated';
    }

    if (floorPlan) {
      return 'calibrated';
    }

    return 'draft';
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