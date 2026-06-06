import { db } from './src/config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function check() {
    try {
        const docRef = doc(db, 'up_config', 'main');
        const snap = await getDoc(docRef);
        const config = snap.data();
        
        console.log(`Total skills: ${config.skills?.length}`);
        
        const assSkills = config.skills.filter(s => s.planerType === 'ass');
        const oaSkills = config.skills.filter(s => s.planerType === 'oa');
        const sharedSkills = config.skills.filter(s => s.planerType === 'shared');
        
        console.log(`ASS Skills: ${assSkills.length}`);
        console.log(`OA Skills: ${oaSkills.length}`);
        console.log(`Shared Skills: ${sharedSkills.length}`);
        console.log(`Uncategorized: ${config.skills.length - assSkills.length - oaSkills.length - sharedSkills.length}`);
        
        console.log("ASS Skills:", assSkills.map(s => s.name));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
check();
