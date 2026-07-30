import { collection, doc, getDoc, getDocs, setDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const ABSENCES_COLL = 'up_absences';
const REQUESTS_COLL = 'up_requests';
const ERRORS_COLL = 'up_errors';

export const firestoreService = {
  /**
   * Loads all absences for a specific planer profile
   * Returns an object: { [empId]: { [date]: entry } }
   */
  async loadAbsences(planerType) {
    try {
      const q = query(collection(db, ABSENCES_COLL), where('planerType', '==', planerType));
      const snapshot = await getDocs(q);
      const state = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // The doc ID is expected to be planerType_empId
        const empId = docSnap.id.replace(`${planerType}_`, '');
        state[empId] = data.dates || {};
      });
      return state;
    } catch (error) {
      console.error('Error loading absences from Firestore:', error);
      throw error;
    }
  },

  /**
   * Saves absences for a single employee
   */
  async saveAbsence(planerType, empId, dates) {
    try {
      const docId = `${planerType}_${empId}`;
      const clean = JSON.parse(JSON.stringify({
        planerType,
        empId,
        dates,
        updatedAt: new Date().toISOString()
      }));
      await setDoc(doc(db, ABSENCES_COLL, docId), clean);
    } catch (error) {
      console.error(`Error saving absence for ${empId}:`, error);
      throw error;
    }
  },

  /**
   * Loads all requests for a specific planer profile
   */
  async loadRequests(planerType) {
    try {
      const q = query(collection(db, REQUESTS_COLL), where('planerType', '==', planerType));
      const snapshot = await getDocs(q);
      const requests = [];
      snapshot.forEach(docSnap => {
        requests.push({ ...docSnap.data(), id: docSnap.id });
      });
      // Sort by date submitted descending
      return requests.sort((a, b) => {
        const dateA = a.stamps?.submitted?.at || '';
        const dateB = b.stamps?.submitted?.at || '';
        return dateB.localeCompare(dateA);
      });
    } catch (error) {
      console.error('Error loading requests from Firestore:', error);
      throw error;
    }
  },

  /**
   * Saves or updates an individual request
   */
  async saveRequest(planerType, request) {
    try {
      const reqId = request.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const clean = JSON.parse(JSON.stringify({
        ...request,
        id: reqId,
        planerType,
        lastUpdated: new Date().toISOString()
      }));
      await setDoc(doc(db, REQUESTS_COLL, reqId), clean, { merge: true });
      return reqId;
    } catch (error) {
      console.error('Error saving request to Firestore:', error);
      throw error;
    }
  },

  /**
   * Deletes a request
   */
  async deleteRequest(requestId) {
    try {
      await deleteDoc(doc(db, REQUESTS_COLL, requestId));
    } catch (error) {
      console.error('Error deleting request from Firestore:', error);
      throw error;
    }
  },

  /**
   * Global Config (Employees, Skills, Settings)
   */
  async loadConfig() {
    try {
      const docSnap = await getDocs(query(collection(db, 'up_config')));
      // We use a single document 'main' for the whole project
      const mainDoc = docSnap.docs.find(d => d.id === 'main');
      return mainDoc ? mainDoc.data() : null;
    } catch (error) {
      console.error('Error loading config from Firestore:', error);
      return null;
    }
  },

  async saveConfig(config) {
    try {
      // Firestore does not accept undefined values – sanitize before writing
      const clean = JSON.parse(JSON.stringify({
        ...config,
        updatedAt: new Date().toISOString()
      }));
      await setDoc(doc(db, 'up_config', 'main'), clean, { merge: true });
    } catch (error) {
      console.error('Error saving config to Firestore:', error);
      throw error;
    }
  },

  async loadPlanerEmployees() {
    try {
      const docSnap = await getDoc(doc(db, 'planer_app_state', 'currentState'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.employees || [];
      }
      return [];
    } catch (error) {
      console.error('Error loading employees from Planer570:', error);
      return [];
    }
  },

  /**
   * Loads rotation assignments from 'rotations_v2' collection in Firestore
   */
  async loadRotation() {
    try {
      const snapshot = await getDocs(collection(db, 'rotations_v2'));
      const assignments = [];
      snapshot.forEach(docSnap => {
        const docId = docSnap.id; // e.g. "month_2026_03"
        const monthId = docId.replace('month_', ''); // "2026_03"
        const data = docSnap.data();
        if (data.assignments) {
          Object.entries(data.assignments).forEach(([areaKey, tokenList]) => {
            // Filter out duplicate suffix keys like HFU_month_2026_03
            if (areaKey.includes('_month_')) return;
            if (Array.isArray(tokenList)) {
              tokenList.forEach(token => {
                if (token && token.mitarbeiter_id) {
                  assignments.push({
                    mi: monthId,
                    bi: areaKey.replace(/_/g, '').toLowerCase(),
                    ei: token.mitarbeiter_id,
                    fraction: token.fraction || 1,
                    info_text: token.info_text || '',
                    position: token.position || 0
                  });
                }
              });
            }
          });
        }
      });
      console.log('Rotation loaded from Firestore collection rotations_v2:', assignments.length, 'assignments');
      return assignments;
    } catch (error) {
      console.error('Error loading rotation from Firestore:', error);
      return null;
    }
  },

  /**
   * Logs an automated error to the database
   */
  async logError(errorData) {
    try {
      const docId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await setDoc(doc(db, ERRORS_COLL, docId), {
        ...errorData,
        timestamp: new Date().toISOString(),
        type: 'auto_error'
      });
    } catch (err) {
      // Intentionally not throwing or alerting to prevent infinite loops if firestore is down
      console.warn('Failed to log error to Firestore:', err);
    }
  },

  /**
   * Submits a manual bug report from the user
   */
  async submitBugReport(reportData) {
    try {
      const docId = `bug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await setDoc(doc(db, ERRORS_COLL, docId), {
        ...reportData,
        timestamp: new Date().toISOString(),
        type: 'manual_report'
      });
    } catch (err) {
      console.error('Failed to submit bug report:', err);
      throw err;
    }
  }
};
