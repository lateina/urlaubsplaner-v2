/**
 * JSONBin.io Service for Urlaubsplaner V2
 */

const API_BASE = 'https://api.jsonbin.io/v3/b';

export const dataService = {
  /**
   * Fetch a bin by ID
   */
  async fetchBin(binId, apiKey) {
    try {
      const response = await fetch(`${API_BASE}/${binId}/latest`, {
        headers: {
          'X-Master-Key': apiKey,
          'X-Bin-Meta': 'false'
        }
      });
      if (!response.ok) throw new Error('Fehler beim Laden der Daten');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * Save data to a bin
   */
  async saveBin(binId, apiKey, data) {
    try {
      const response = await fetch(`${API_BASE}/${binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': apiKey
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Fehler beim Speichern der Daten');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};
