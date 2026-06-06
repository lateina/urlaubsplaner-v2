import { db } from './src/config/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

async function recover() {
    try {
        const docRef = doc(db, 'up_config', 'main');
        const snap = await getDoc(docRef);
        const config = snap.data();
        const apiKey = config.jsonbin_key;
        
        console.log("Fetching from OLD ASS JSONBin...");
        const response = await fetch(`https://api.jsonbin.io/v3/b/699ffb53ae596e708f4b3de5/latest`, {
            headers: { 'X-Master-Key': apiKey }
        });
        const json = await response.json();
        const oldEmployees = json.record?.employees || json.record?.mitarbeiter || [];
        
        console.log(`Found ${oldEmployees.length} employees in OLD JSONBin.`);
        
        if (oldEmployees.length > 0) {
            console.log("Restoring to Firestore...");
            // Merge with existing employees
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
