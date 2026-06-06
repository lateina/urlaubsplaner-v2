import { db } from './src/config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import { APP_CONFIG } from './src/config/appConfig.js';

async function recover() {
    try {
        const docRef = doc(db, 'up_config', 'main');
        const snap = await getDoc(docRef);
        const config = snap.data();
        const apiKey = config.jsonbin_key;
        
        const metaResp = await fetch(`https://api.jsonbin.io/v3/b/${APP_CONFIG.ASS_BIN_ID}`, {
            headers: { 'X-Master-Key': apiKey, 'X-Bin-Meta': 'true' }
        });
        const metaJson = await metaResp.json();
        console.log("Meta:", metaJson.metadata);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
recover();
