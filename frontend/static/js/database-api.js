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

  // Projekter
  async createProject(name, description) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  }

  async getAllProjects() {
    return this.request('/projects');
  }

  async getProject(id) {
    return this.request(`/projects/${id}`);
  }

  async updateProject(id, name, description) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description })
    });
  }

  async updateProjectStatus(id, status) {
    return this.request(`/projects/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async deleteProject(id) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE'
    });
  }

  // Målinger
  async addMeasurement(projectId, measurement) {
    return this.request(`/projects/${projectId}/measurements`, {
      method: 'POST',
      body: JSON.stringify(measurement)
    });
  }

  async getMeasurements(projectId) {
    return this.request(`/projects/${projectId}/measurements`);
  }

  // Kalibrering
  async saveCalibration(projectId, floorPlanImage, scaleFactor, referencePoints) {
    return this.request(`/projects/${projectId}/calibration`, {
      method: 'POST',
      body: JSON.stringify({
        floorPlanImage,
        scaleFactor,
        referencePoints
      })
    });
  }

  async getCalibration(projectId) {
    return this.request(`/projects/${projectId}/calibration`);
  }

  // Rapporter
  async saveReport(projectId, reportType, reportData) {
    return this.request(`/projects/${projectId}/reports`, {
      method: 'POST',
      body: JSON.stringify({ reportType, reportData })
    });
  }

  async getReports(projectId) {
    return this.request(`/projects/${projectId}/reports`);
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