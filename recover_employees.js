import { db } from './src/config/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { APP_CONFIG } from './src/config/appConfig.js';

async function recover() {
    try {
        console.log("Fetching config from Firestore...");
        const docRef = doc(db, 'up_config', 'main');
        const snap = await getDoc(docRef);
        const config = snap.data();
        
        const apiKey = config.jsonbin_key;
        console.log("Found JSONBin Key:", apiKey ? "YES" : "NO");
        
        if (!apiKey) return;
        
        console.log("Fetching from JSONBin...");
        const response = await fetch(`${APP_CONFIG.API_URL}/${APP_CONFIG.ASS_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': apiKey }
        });
        const json = await response.json();
        const oldEmployees = json.record.employees || json.record.mitarbeiter || [];
        
        console.log(`Found ${oldEmployees.length} employees in JSONBin.`);
        
        if (oldEmployees.length > 0) {
            console.log("Restoring to Firestore...");
            // Merge with existing employees just in case
            const existingEmpIds = new Set((config.employees || []).map(e => e.id));
            const merged = [...config.employees || []];
            
            for (const e of oldEmployees) {
                if (!existingEmpIds.has(e.id)) {
                    merged.push(e);
                    existingEmpIds.add(e.id);
                }
            }
            
            await setDoc(docRef, { employees: merged }, { merge: true });
            console.log(`Restored! Total employees now: ${merged.length}`);
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
recover();
