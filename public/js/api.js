// Base API URL
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Make API request with error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<Object>} API response
 */
export async function apiRequest(endpoint, options = {}) {
  try {
    console.log(`Making API request to ${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      // Get raw response text to check if it's HTML
      const text = await response.text();
      
      // Check if response is HTML
      if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        console.error('API Response:', text);
        throw new Error('API returned HTML instead of JSON');
      }
      
      // Try to parse as JSON
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'API Error');
      } catch (e) {
        throw new Error(`API Error: ${text}`);
      }
    }
    
    const data = await response.json();
    console.log('API response received:', data);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Export API endpoints
export const api = {
  // Basic test
  test: () => apiRequest('/test-repo', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }),
  
  // Repository operations
  getMetadata: (owner, repo) => apiRequest(`/repos/${owner}/${repo}`),
  getContributors: (owner, repo) => apiRequest(`/repos/${owner}/${repo}/contributors`),
  getCommits: (owner, repo) => {
    console.log(`[getCommits] Fetching commits for ${owner}/${repo}`);
    try {
      const response = apiRequest(`/api/commits?owner=${owner}&repo=${repo}`);
      console.log('[getCommits] Raw API response:', response);
      return response;
    } catch (error) {
      console.error('[getCommits] Error:', error);
      throw error;
    }
  },
  getLanguages: (owner, repo) => {
    console.log(`Fetching languages for ${owner}/${repo}`);
    try {
      const response = apiRequest(`/api/languages?owner=${owner}&repo=${repo}`);
      console.log('Language API response:', response);
      return response;
    } catch (error) {
      console.error('Language fetch error:', error);
      throw error;
    }
  },
  getFiles: async (owner, repo) => {
    try {
      console.log('[getFiles] Fetching files for', owner, repo);
      const response = await apiRequest(`/api/files?owner=${owner}&repo=${repo}`);
      console.log('[getFiles] Response:', response);
      
      if (!response.data) {
        console.error('[getFiles] Invalid response data:', response);
        throw new Error('Invalid response data');
      }

      return response;
    } catch (error) {
      console.error('[getFiles] Error:', error);
      throw error;
    }
  },
  
  // Validation
  validate: (repo) => apiRequest(`/repos/validate?repo=${encodeURIComponent(repo)}`),
  
  // Cache
  getCacheStats: () => apiRequest('/cache/stats'),
  clearCache: () => apiRequest('/cache/clear', { method: 'POST' })
};
