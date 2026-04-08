import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

const BINS = {
    '694548d1d0ea881f403427e3': { type: 'oa', url: 'https://lateina.github.io/urlaubsplaner-v2/' },
    '699ffb53ae596e708f4b3de5': { type: 'ass', url: 'https://lateina.github.io/urlaubsplaner-v2/assistenz.html' },
};

const TYPE_LABELS = { U: 'Urlaub', D: 'Dienstreise', F: 'Fortbildung', S: 'Sonstiges', FZA: 'Freizeitausgleich' };

async function fetchBin(binId) {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const data = await res.json();
    return data.record;
}

// Helper to convert Firestore's "Value" format back to plain JS
function fromFirestore(fields) {
    const res = {};
    for (const [key, value] of Object.entries(fields)) {
        if (value.stringValue !== undefined) res[key] = value.stringValue;
        else if (value.arrayValue !== undefined) res[key] = (value.arrayValue.values || []).map(v => v.stringValue || fromFirestore(v.mapValue.fields));
        else if (value.mapValue !== undefined) res[key] = fromFirestore(value.mapValue.fields);
        else if (value.booleanValue !== undefined) res[key] = value.booleanValue;
        else if (value.integerValue !== undefined) res[key] = parseInt(value.integerValue, 10);
        else if (value.timestampValue !== undefined) res[key] = value.timestampValue;
    }
    return res;
}

// Convert plain JS back to Firestore "Value" format (Simplified for our needs)
function toFirestore(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') fields[key] = { stringValue: value };
        else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
        else if (Array.isArray(value)) fields[key] = { arrayValue: { values: value.map(v => typeof v === 'string' ? { stringValue: v } : { mapValue: { fields: toFirestore(v) } }) } };
        else if (typeof value === 'object' && value !== null) fields[key] = { mapValue: { fields: toFirestore(value) } };
    }
    return fields;
}

async function fetchFirestoreCollection(collectionId) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.documents || []).map(doc => ({
        ...fromFirestore(doc.fields),
        id: doc.name.split('/').pop()
    }));
}

async function updateFirestoreDocument(collectionId, docId, fieldsToUpdate) {
    const updateMask = Object.keys(fieldsToUpdate).map(k => `updateMask.fieldPaths=${k}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}/${docId}?${updateMask}&key=${FIREBASE_API_KEY}`;
    
    await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestore(fieldsToUpdate) })
    });
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASSWORD
    }
});

async function sendEmail(to, subject, text, footer = '-- Automatische Benachrichtigung vom Urlaubsplaner') {
    await transporter.sendMail({
        from: `"Urlaubsplaner" <${GMAIL_USER}>`,
        to,
        subject,
        text: text + '\n\n' + footer
    });
    console.log(`  → Email sent to ${to}: ${subject}`);
}

function fmtDates(dates) {
    if (!dates || dates.length === 0) return '';
    const start = dates[0];
    const end = dates[dates.length - 1];
    return start === end ? start : `${start} bis ${end}`;
}

async function run() {
    console.log('--- Starting Daily Email Notifications (Hybrid Firestore Mode) ---');
    
    if (!JSONBIN_KEY || !FIREBASE_API_KEY || !FIREBASE_PROJECT_ID || !GMAIL_PASSWORD || !ADMIN_EMAIL || !SEKRETARIAT_EMAIL) {
        console.error('Missing environment variables!');
        process.exit(1);
    }

    // 1. Fetch employees from JSONBin
    const allEmployees = [];
    const binIds = Object.keys(BINS);
    for (const binId of binIds) {
        try {
            console.log(`Fetching Employees from Bin ${binId}...`);
            const data = await fetchBin(binId);
            if (data.employees) allEmployees.push(...data.employees);
        } catch (err) {
            console.error(`Error fetching bin ${binId}:`, err);
        }
    }

    // 2. Fetch all requests from Firestore
    console.log('Fetching Requests from Firestore...');
    const allRequests = await fetchFirestoreCollection('up_requests');
    console.log(`Found ${allRequests.length} requests in Firestore.`);

    let adminDigest = [];
    let sekrDigest = [];

    // 3. Process each bin
    for (const [binId, config] of Object.entries(BINS)) {
        const appUrl = config.url;
        const planerType = config.type;
        
        console.log(`Processing Notifications for ${planerType} profile...`);
        const requestsInBin = allRequests.filter(r => r.planerType === planerType);

        for (const req of requestsInBin) {
            const notified = req.notified || {};
            const emp = allEmployees.find(e => e.id === req.empId);
            const vtr = allEmployees.find(e => e.id === req.vertreterId);
            
            const empName = emp?.name || req.empId;
            const datesStr = fmtDates(req.dates);
            const typeLabel = TYPE_LABELS[req.type] || req.type;
            const link = `\nZum Urlaubsplaner:\n${appUrl}\n`;

            const updates = {};

            // 1. Pending Vertreter -> Individual Email
            if (req.status === 'pending_vertreter' && !notified.pending_vertreter) {
                if (vtr?.email) {
                    await sendEmail(vtr.email, 
                        `Vertretungsanfrage von ${empName}`,
                        `Hallo ${vtr.name},\n\n${empName} beantragt ${typeLabel} (${datesStr}) und bittet dich um Zustimmung als Vertreter.${link}`
                    );
                    notified.pending_vertreter = true;
                    updates.notified = notified;
                }
            }

            // 2. Pending Admin -> Add to Admin Digest
            if (req.status === 'pending_admin' && !notified.pending_admin) {
                adminDigest.push(`• ${empName} | ${typeLabel} | ${datesStr}${req.vertreter ? ` | Vertreter: ${req.vertreter}` : ''}\n  → ${appUrl}`);
                notified.pending_admin = true;
                updates.notified = notified;
            }

            // 3. Approved -> Individual Email + Sekr Digest
            if (req.status === 'approved' && !notified.approved) {
                if (emp?.email) {
                    await sendEmail(emp.email,
                        'Dein Antrag wurde genehmigt ✓',
                        `Hallo ${empName},\n\ndein Antrag auf ${typeLabel} (${datesStr}) wurde genehmigt.${link}`
                    );
                    notified.approved = true;
                    updates.notified = notified;
                }
                if (!notified.sekretariat) {
                    sekrDigest.push(`• ${empName} | ${typeLabel} | ${datesStr}${req.vertreter ? ` | Vertreter: ${req.vertreter}` : ''}`);
                    notified.sekretariat = true;
                    updates.notified = notified;
                }
            }

            // 4. Rejected -> Individual Email
            if (req.status === 'rejected' && !notified.rejected) {
                if (emp?.email) {
                    const by = req.rejectedBy === 'vertreter' ? 'deinem Vertreter' : 'dem Leitenden Oberarzt';
                    await sendEmail(emp.email,
                        'Dein Antrag wurde abgelehnt',
                        `Hallo ${empName},\n\ndein Antrag auf ${typeLabel} (${datesStr}) wurde von ${by} abgelehnt.${req.rejectionNote ? `\nGrund: ${req.rejectionNote}` : ''}${link}`
                    );
                    notified.rejected = true;
                    updates.notified = notified;
                }
            }

            if (Object.keys(updates).length > 0) {
                await updateFirestoreDocument('up_requests', req.id, updates);
                console.log(`  → Firestore updated for request ${req.id}`);
            }
        }
    }

    // Send Admin Digest
    if (adminDigest.length > 0) {
        await sendEmail(ADMIN_EMAIL,
            `Urlaubsplaner: ${adminDigest.length} neue Anträge zur Genehmigung`,
            `Guten Morgen,\n\nfolgende Anträge stehen noch zur Genehmigung aus:\n\n${adminDigest.join('\n\n')}`
        );
    }

    // Send Sekretariat Digest
    if (sekrDigest.length > 0) {
        await sendEmail(SEKRETARIAT_EMAIL,
            `Urlaubsplaner: ${sekrDigest.length} neue genehmigte Abwesenheiten`,
            `Guten Morgen,\n\nfolgende Abwesenheiten wurden genehmigt und müssen im PO eingetragen werden:\n\n${sekrDigest.join('\n\n')}`,
            'Viele Grüße\nProf. Stefan Wagner'
        );
    }

    console.log('--- Finished. ---');
}

run();
