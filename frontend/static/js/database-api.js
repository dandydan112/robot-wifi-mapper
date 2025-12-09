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

  async createProject(project) {
    const payload = {
      name: project?.name,
      building: project?.building || null,
      description: project?.description || null
    };
    return this.request('/floor-plans', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getAllProjects() {
    return this.request('/floor-plans');
  }

  async getProject(id) {
    return this.request(`/floor-plans/${id}`);
  }

  async updateProject(id, updates) {
    return this.request(`/floor-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteProject(id) {
    return this.request(`/floor-plans/${id}`, {
      method: 'DELETE'
    });
  }

  async getMeasurementPoints(floorPlanId) {
    const endpoint = floorPlanId !== undefined && floorPlanId !== null
      ? `/measurement-points?floorPlanId=${encodeURIComponent(floorPlanId)}`
      : '/measurement-points';
    return this.request(endpoint);
  }

  async updateFloorPlanDetails(floorPlanId, details) {
    return this.request(`/floor-plans/${floorPlanId}`, {
      method: 'PUT',
      body: JSON.stringify(details)
    });
  }

  async saveCalibration(floorPlanId, imagePath, scaleFactor, referencePoints) {
    return this.updateFloorPlanDetails(floorPlanId, {
      imagePath,
      scaleFactor,
      referencePoints
    });
  }

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

window.dbAPI = new DatabaseAPI();
