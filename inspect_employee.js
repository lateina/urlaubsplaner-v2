import { db } from './src/config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function check() {
    try {
        const docRef = doc(db, 'up_config', 'main');
        const snap = await getDoc(docRef);
        const config = snap.data();
        const emps = config.employees || [];
        
        const ass = emps.filter(e => e.role !== 'Oberarzt' && !e.isOberarzt && !(e.groups || []).includes('skill_funktionsoberarzt') && e.id !== 'admin' && e.id !== 'sekretariat');
        
        if (ass.length > 0) {
            console.log("Sample Assistant Data:", JSON.stringify(ass[0], null, 2));
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
check();
