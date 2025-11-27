// Database API client for WiFi Mapper
class DatabaseAPI {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Database API error:', error);
      throw error;
    }
  }

  // Floor Plans (tidligere projekter)
  async createProject(name, description) {
    // Note: description ignoreres i ny struktur
    return this.request('/floor-plans', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  async getAllProjects() {
    return this.request('/floor-plans');
  }

  async getProject(id) {
    return this.request(`/floor-plans/${id}`);
  }

  async updateProject(id, name, description) {
    // Note: description ignoreres i ny struktur
    return this.request(`/floor-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
  }

  async updateProjectStatus(id, status) {
    // Status findes ikke længere i ny struktur - returnerer bare projektet
    return this.getProject(id);
  }

  async deleteProject(id) {
    return this.request(`/floor-plans/${id}`, {
      method: 'DELETE'
    });
  }

  // Rooms
  async createRoom(floorPlanId, name) {
    return this.request(`/floor-plans/${floorPlanId}/rooms`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  async getRooms(floorPlanId) {
    return this.request(`/floor-plans/${floorPlanId}/rooms`);
  }

  // Access Points
  async createAccessPoint(floorPlanId, internetName, location, frequencyBand, macAdress) {
    return this.request(`/floor-plans/${floorPlanId}/access-points`, {
      method: 'POST',
      body: JSON.stringify({ internetName, location, frequencyBand, macAdress })
    });
  }

  async getAccessPoints(floorPlanId) {
    return this.request(`/floor-plans/${floorPlanId}/access-points`);
  }

  // Measuring Points (tidligere målinger)
  async addMeasurement(projectId, measurement) {
    // Denne metode skal nu bruge accessPointId i stedet for projectId
    // For bagudkompatibilitet returnerer vi tom array
    console.warn('addMeasurement skal opdateres til at bruge createMeasuringPoint med accessPointId');
    return { id: 0 };
  }

  async getMeasurements(projectId) {
    // Returnerer tom array for bagudkompatibilitet
    // Målinger hentes nu via getAccessPoints og derefter getMeasuringPoints
    return [];
  }

  async createMeasuringPoint(accessPointId, position, signalStrength) {
    return this.request(`/access-points/${accessPointId}/measuring-points`, {
      method: 'POST',
      body: JSON.stringify({ position, signalStrength })
    });
  }

  async getMeasuringPoints(accessPointId) {
    return this.request(`/access-points/${accessPointId}/measuring-points`);
  }

  // Heatmaps
  async createHeatmap(floorPlanId) {
    return this.request(`/floor-plans/${floorPlanId}/heatmaps`, {
      method: 'POST'
    });
  }

  async getHeatmaps(floorPlanId) {
    return this.request(`/floor-plans/${floorPlanId}/heatmaps`);
  }

  // Kalibrering - fjernet i ny struktur
  async saveCalibration(projectId, floorPlanImage, scaleFactor, referencePoints) {
    console.warn('Kalibrering er fjernet i ny database struktur');
    return { message: 'Kalibrering ikke understøttet' };
  }

  async getCalibration(projectId) {
    return null;
  }

  // Rapporter - fjernet i ny struktur
  async saveReport(projectId, reportType, reportData) {
    console.warn('Rapporter er fjernet i ny database struktur');
    return { id: 0 };
  }

  async getReports(projectId) {
    return [];
  }

  // Database info
  async getDatabaseInfo() {
    return this.request('/database/info');
  }

  async exportDatabase() {
    return this.request('/database/export', {
      method: 'POST'
    });
  }

  async copyDatabase() {
    return this.request('/database/copy', {
      method: 'POST'
    });
  }
}

// Global database instance
window.dbAPI = new DatabaseAPI();