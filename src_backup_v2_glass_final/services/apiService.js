import { APP_CONFIG } from '../config/appConfig';

export const apiService = {
  /**
   * Loads the latest record from a specific JSONBin bin
   * @param {string} binId 
   * @param {string} apiKey 
   * @returns {Promise<any>}
   */
  async load(binId, apiKey) {
    try {
      const response = await fetch(`${APP_CONFIG.API_URL}/${binId}/latest`, {
        headers: {
          'X-Master-Key': apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load data');
      }

      const data = await response.json();
      return data.record;
    } catch (error) {
      console.error('API Load Error:', error);
      throw error;
    }
  },

  /**
   * Updates a specific JSONBin bin with new data
   * @param {string} binId 
   * @param {string} apiKey 
   * @param {any} payload 
   * @returns {Promise<any>}
   */
  async save(binId, apiKey, payload) {
    try {
      const response = await fetch(`${APP_CONFIG.API_URL}/${binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save data');
      }

      const data = await response.json();
      return data.record;
    } catch (error) {
      console.error('API Save Error:', error);
      throw error;
    }
  }
};
