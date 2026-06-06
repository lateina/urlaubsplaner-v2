import { db } from './src/config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function check() {
    try {
        const docRef = doc(db, 'up_config', 'main');
        const snap = await getDoc(docRef);
        const config = snap.data();
        const emps = config.employees || [];
        
        console.log(`Total employees: ${emps.length}`);
        
        const oas = emps.filter(e => e.role === 'Oberarzt' || e.isOberarzt);
        const foas = emps.filter(e => (e.groups || []).includes('skill_funktionsoberarzt'));
        const ass = emps.filter(e => e.role !== 'Oberarzt' && !e.isOberarzt && !(e.groups || []).includes('skill_funktionsoberarzt') && e.id !== 'admin' && e.id !== 'sekretariat');
        
        console.log(`OAs: ${oas.length}`);
        console.log(`FOAs: ${foas.length}`);
        console.log(`ASS: ${ass.length}`);
        console.log(`Others: ${emps.length - oas.length - foas.length - ass.length}`);
        
        console.log("Sample ASS:", ass.slice(0, 3).map(e => e.name));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
check();
