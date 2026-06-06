import { db } from './src/config/firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

async function exportAll() {
  const data = {
    up_config: {},
    up_absences: {},
    up_requests: {},
    rotations_v2: []
  };

  try {
    console.log("Exporting up_config...");
    const mainDoc = await getDoc(doc(db, 'up_config', 'main'));
    if (mainDoc.exists()) data.up_config.main = mainDoc.data();

    console.log("Exporting up_absences...");
    const absSnap = await getDocs(collection(db, 'up_absences'));
    absSnap.forEach(d => data.up_absences[d.id] = d.data());

    console.log("Exporting up_requests...");
    const reqSnap = await getDocs(collection(db, 'up_requests'));
    reqSnap.forEach(d => data.up_requests[d.id] = d.data());

    console.log("Exporting rotations_v2...");
    const rotSnap = await getDocs(collection(db, 'rotations_v2'));
    rotSnap.forEach(d => data.rotations_v2.push({ id: d.id, ...d.data() }));

    const filename = `firestore_backup_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Backup saved to ${filename}`);
  } catch (e) {
    console.error("Backup failed:", e);
  }
  process.exit(0);
}

exportAll();
