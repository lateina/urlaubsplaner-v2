import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const JSONBIN_KEY = process.env.JSONBIN_KEY;
const GMAIL_USER = process.env.GMAIL_USER || 'dienstereminder@gmail.com';
const GMAIL_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const SEKRETARIAT_EMAIL = process.env.SEKRETARIAT_EMAIL;

const BINS = {
    '694548d1d0ea881f403427e3': { type: 'oa', url: 'https://lateina.github.io/urlaubsplaner-v2/' },
    '699ffb53ae596e708f4b3de5': { type: 'ass', url: 'https://lateina.github.io/urlaubsplaner-v2/assistenz.html' },
};

const TYPE_LABELS = { U: 'Urlaub', D: 'Dienstreise', F: 'Fortbildung', S: 'Sonstiges', FZA: 'Freizeitausgleich' };

let AUTH_TOKEN = null;

async function getAuthToken() {
    if (AUTH_TOKEN) return AUTH_TOKEN;
    if (!FIREBASE_API_KEY) return null;
    try {
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Referer': 'https://lateina.github.io/',
                'Origin': 'https://lateina.github.io'
            },
            body: JSON.stringify({ returnSecureToken: true })
        });
        const data = await res.json();
        if (data.idToken) {
            AUTH_TOKEN = data.idToken;
            return AUTH_TOKEN;
        }
        console.warn('Auth token fetch failed:', data.error?.message || 'Unknown error');
        return null;
    } catch (e) {
        console.warn('Auth token fetch failed:', e.message);
        return null;
    }
}

// Helper to convert Firestore's "Value" format back to plain JS
function fromFirestore(fields) {
    if (!fields) return {};
    const res = {};
    for (const [key, value] of Object.entries(fields)) {
        if (value.stringValue !== undefined) res[key] = value.stringValue;
        else if (value.arrayValue !== undefined) res[key] = (value.arrayValue.values || []).map(v => v.stringValue || (v.mapValue ? fromFirestore(v.mapValue.fields) : v));
        else if (value.mapValue !== undefined) res[key] = fromFirestore(value.mapValue.fields);
        else if (value.booleanValue !== undefined) res[key] = value.booleanValue;
        else if (value.integerValue !== undefined) res[key] = parseInt(value.integerValue, 10);
        else if (value.timestampValue !== undefined) res[key] = value.timestampValue;
    }
    return res;
}

// Convert plain JS back to Firestore "Value" format
function toFirestore(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') fields[key] = { stringValue: value };
        else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
        else if (typeof value === 'number') fields[key] = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
        else if (Array.isArray(value)) fields[key] = { arrayValue: { values: value.map(v => typeof v === 'string' ? { stringValue: v } : { mapValue: { fields: toFirestore(v) } }) } };
        else if (typeof value === 'object' && value !== null) fields[key] = { mapValue: { fields: toFirestore(value) } };
    }
    return fields;
}

async function fetchFirestoreDocument(path) {
    const token = await getAuthToken();
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}${FIREBASE_API_KEY ? `?key=${FIREBASE_API_KEY}` : ''}`;
    const headers = {
        'Referer': 'https://lateina.github.io/',
        'Origin': 'https://lateina.github.io'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(url, { headers });
    if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
            console.error(`Permission denied fetching document ${path}. Check Firestore rules and Auth.`);
        }
        return null;
    }
    const data = await res.json();
    return fromFirestore(data.fields);
}

async function fetchFirestoreCollection(collectionId) {
    const token = await getAuthToken();
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}?pageSize=1000${FIREBASE_API_KEY ? `&key=${FIREBASE_API_KEY}` : ''}`;
    const headers = {
        'Referer': 'https://lateina.github.io/',
        'Origin': 'https://lateina.github.io'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
            console.error(`Permission denied fetching collection ${collectionId}.`);
        }
        return [];
    }
    const data = await res.json();
    return (data.documents || []).map(doc => ({
        ...fromFirestore(doc.fields),
        id: doc.name.split('/').pop()
    }));
}

async function updateFirestoreDocument(collectionId, docId, fieldsToUpdate) {
    const token = await getAuthToken();
    const updateMask = Object.keys(fieldsToUpdate).map(k => `updateMask.fieldPaths=${k}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}/${docId}?${updateMask}${FIREBASE_API_KEY ? `&key=${FIREBASE_API_KEY}` : ''}`;
    
    const headers = { 
        'Content-Type': 'application/json',
        'Referer': 'https://lateina.github.io/',
        'Origin': 'https://lateina.github.io'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: toFirestore(fieldsToUpdate) })
    });
    if (!res.ok) {
        const err = await res.text();
        console.error(`Error updating document ${docId}:`, err);
    }
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
    if (!to || !to.includes('@') || to.length < 5 || to.trim() === '@') {
        console.warn(`  → Skipped sending email to invalid address: "${to}"`);
        return;
    }
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
    console.log('--- Starting Daily Email Notifications (Unified Firestore Mode) ---');
    
    if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID || !GMAIL_PASSWORD || !GMAIL_USER || !ADMIN_EMAIL || !SEKRETARIAT_EMAIL) {
        console.error('Missing environment variables!');
        console.error('Check: FIREBASE_API_KEY, FIREBASE_PROJECT_ID, GMAIL_APP_PASSWORD, GMAIL_USER, ADMIN_EMAIL, SEKRETARIAT_EMAIL');
        process.exit(1);
    }

    // 1. Fetch configuration (Employees) from Firestore
    console.log('Fetching Config from Firestore...');
    const configData = await fetchFirestoreDocument('up_config/main');
    if (!configData || !configData.employees) {
        console.error('Could not load employees from Firestore up_config/main');
        process.exit(1);
    }
    const allEmployees = configData.employees;
    console.log(`Loaded ${allEmployees.length} employees.`);

    // 2. Fetch all requests from Firestore
    console.log('Fetching Requests from Firestore...');
    const allRequests = await fetchFirestoreCollection('up_requests');
    console.log(`Found ${allRequests.length} requests in Firestore.`);

    // 2.5 Fetch all errors from Firestore
    console.log('Fetching Errors from Firestore...');
    const allErrors = await fetchFirestoreCollection('up_errors');
    console.log(`Found ${allErrors.length} error reports in Firestore.`);

    let adminDigest = [];
    let sekrDigest = [];
    let personDigests = {}; // { email: { name: string, items: [] } }
    let firestoreUpdates = []; // [ { coll, id, fields } ]

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
            const link = `\nZum Urlaubsplaner: ${appUrl}\n`;

            const updates = {};

            // 1. Pending Vertreter -> Digest
            if (req.status === 'pending_vertreter' && !notified.pending_vertreter) {
                if (vtr?.email) {
                    if (!personDigests[vtr.email]) personDigests[vtr.email] = { name: vtr.name, items: [] };
                    personDigests[vtr.email].items.push(`• Vertretungsanfrage von ${empName}: ${typeLabel} (${datesStr})${link}`);
                    notified.pending_vertreter = true;
                    updates.notified = notified;
                }
            }

            // 1.5 Pending Supervisor -> Digest
            if (req.status === 'pending_supervisor' && !notified.pending_supervisor) {
                const sup = allEmployees.find(e => e.id === req.supervisorId);
                if (sup?.email) {
                    const supLink = `\nZum Urlaubsplaner: ${appUrl}\n`;
                    if (!personDigests[sup.email]) personDigests[sup.email] = { name: sup.name, items: [] };
                    personDigests[sup.email].items.push(`• Freigabeanfrage von ${empName}: ${typeLabel} (${datesStr})${supLink}`);
                    notified.pending_supervisor = true;
                    updates.notified = notified;
                }
            }

            // 2. Pending Admin -> Add to Admin Digest
            if (req.status === 'pending_admin' && !notified.pending_admin) {
                adminDigest.push(`• ${empName} | ${typeLabel} | ${datesStr}${req.vertreter ? ` | Vertreter: ${req.vertreter}` : ''}\n  → ${appUrl}`);
                notified.pending_admin = true;
                updates.notified = notified;
            }

            // 3. Approved -> Digest + Sekr Digest
            if (req.status === 'approved' && !notified.approved) {
                if (emp?.email) {
                    if (!personDigests[emp.email]) personDigests[emp.email] = { name: empName, items: [] };
                    personDigests[emp.email].items.push(`• Dein Antrag auf ${typeLabel} (${datesStr}) wurde GENEHMIGT ✓${link}`);
                    notified.approved = true;
                    updates.notified = notified;
                }
                if (!notified.sekretariat) {
                    sekrDigest.push(`• ${empName} | ${typeLabel} | ${datesStr}${req.vertreter ? ` | Vertreter: ${req.vertreter}` : ''}`);
                    notified.sekretariat = true;
                    updates.notified = notified;
                }
            }

            // 4. Rejected -> Digest
            if (req.status === 'rejected' && !notified.rejected) {
                if (emp?.email) {
                    const by = req.rejectedBy === 'vertreter' ? 'deinem Vertreter' : 'dem Leitenden Oberarzt';
                    if (!personDigests[emp.email]) personDigests[emp.email] = { name: empName, items: [] };
                    personDigests[emp.email].items.push(`• Dein Antrag auf ${typeLabel} (${datesStr}) wurde von ${by} ABGELEHNT.${req.rejectionNote ? ` Grund: ${req.rejectionNote}` : ''}${link}`);
                    notified.rejected = true;
                    updates.notified = notified;
                }
            }

            // 5. Admin changed dates
            if (req.admin_changed_dates_at && !notified.admin_changed_dates) {
                // Email Employee
                if (emp?.email) {
                    if (!personDigests[emp.email]) personDigests[emp.email] = { name: empName, items: [] };
                    personDigests[emp.email].items.push(`• ACHTUNG: Das Datum für deinen Antrag auf ${typeLabel} wurde vom Admin geändert auf: ${datesStr}${link}`);
                }
                // Email Vertreter
                if (vtr?.email) {
                    if (!personDigests[vtr.email]) personDigests[vtr.email] = { name: vtr.name, items: [] };
                    personDigests[vtr.email].items.push(`• ACHTUNG: Das Datum für die Vertretung von ${empName} (${typeLabel}) wurde vom Admin geändert auf: ${datesStr}${link}`);
                }
                // Email Supervisor
                const sup = allEmployees.find(e => e.id === req.supervisorId);
                if (sup?.email) {
                    if (!personDigests[sup.email]) personDigests[sup.email] = { name: sup.name, items: [] };
                    personDigests[sup.email].items.push(`• ACHTUNG: Das Datum für den Antrag von ${empName} (${typeLabel}) wurde vom Admin geändert auf: ${datesStr}${link}`);
                }
                
                notified.admin_changed_dates = true;
                updates.notified = notified;
            }

            if (Object.keys(updates).length > 0) {
                firestoreUpdates.push({ coll: 'up_requests', id: req.id, fields: updates });
            }
        }
    }

    // --- Process Bug Reports / Errors ---
    console.log('Processing Bug Reports...');
    for (const err of allErrors) {
        const notified = err.notified || {};
        if (!notified.admin) {
            const timeStr = err.timestamp ? new Date(err.timestamp).toLocaleString('de-DE') : 'Unbekannt';
            const userStr = err.user || 'Unbekannt';
            const typeStr = err.type === 'manual_report' ? 'Benutzer-Feedback' : 'Systemfehler';
            
            adminDigest.push(`[${typeStr}] von ${userStr} am ${timeStr}:\n"${err.message}"\nUrl: ${err.url || '-'}`);
            
            notified.admin = true;
            firestoreUpdates.push({ coll: 'up_errors', id: err.id, fields: { notified } });
        }
    }

    // --- New: Monthly Vacation Reminder Logic ---
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthStr = `${currentYear}-${today.getMonth()}`;
    
    if (configData.lastVacationReminderMonth !== currentMonthStr) {
        console.log('--- Checking Monthly Vacation Reminders ---');
        const stats = configData.vacationStats || {};
        const lowUsageEmployees = [];

        for (const emp of allEmployees) {
            if (emp.role === 'Admin' || emp.role === 'Sekretariat') continue;
            
            const empStats = stats[emp.id] || { total: 0, quota: 30 };
            const used = empStats.total || 0;
            const quota = empStats.quota || 30;
            const percentage = (used / quota) * 100;

            if (percentage < 50) {
                lowUsageEmployees.push({ name: emp.name, used, quota, email: emp.email });
                
                if (emp.email) {
                    const userAppUrl = (emp.role === 'Oberarzt' || emp.isOberarzt) ? 'https://lateina.github.io/urlaubsplaner-v2/' : 'https://lateina.github.io/urlaubsplaner-v2/assistenz.html';
                    if (!personDigests[emp.email]) personDigests[emp.email] = { name: emp.name, items: [] };
                    personDigests[emp.email].items.push(`• Erinnerung: Du hast erst ${used} von ${quota} Urlaubstagen für dieses Jahr verplant. Bitte denke daran, deinen restlichen Urlaub zeitnah einzureichen.\nZum Urlaubsplaner: ${userAppUrl}`);
                }
            }
        }

        if (lowUsageEmployees.length > 0) {
            const summaryList = lowUsageEmployees.map(e => `• ${e.name}: ${e.used}/${e.quota} Tage verplant`).join('\n');
            adminDigest.push(`\n[Urlaubs-Erinnerung] Folgende Mitarbeiter haben noch weniger als 50% ihres Urlaubs verplant:\n${summaryList}`);
            sekrDigest.push(`\n[Urlaubs-Erinnerung] Folgende Mitarbeiter haben noch weniger als 50% ihres Urlaubs verplant:\n${summaryList}`);
        }

        // Mark as sent for this month
        firestoreUpdates.push({ coll: 'up_config', id: 'main', fields: { lastVacationReminderMonth: currentMonthStr } });
        console.log(`  → Monthly reminders processed and flag set for ${currentMonthStr}`);
    }
    // --- End of Monthly Logic ---

    // Send Employee Digests
    for (const [email, digest] of Object.entries(personDigests)) {
        try {
            await sendEmail(email,
                'Urlaubsplaner: Neue Benachrichtigungen',
                `Hallo ${digest.name},\n\nes gibt Neuigkeiten zu deinen Anträgen im Urlaubsplaner:\n\n${digest.items.join('\n')}`
            );
        } catch (e) {
            console.error(`Error sending email to ${email}:`, e.message);
        }
    }

    // Send Admin Digest
    if (adminDigest.length > 0) {
        try {
            await sendEmail(ADMIN_EMAIL,
                `Urlaubsplaner: ${adminDigest.length} neue Mitteilungen (Anträge / Fehler)`,
                `Guten Morgen,\n\nhier ist die Übersicht der neuesten Benachrichtigungen:\n\n${adminDigest.join('\n\n------------------------\n\n')}`
            );
        } catch (e) {
            console.error(`Error sending Admin Digest:`, e.message);
        }
    }

    // Send Sekretariat Digest
    if (sekrDigest.length > 0) {
        try {
            await sendEmail(SEKRETARIAT_EMAIL,
                `Urlaubsplaner: ${sekrDigest.length} neue genehmigte Abwesenheiten`,
                `Guten Morgen,\n\nfolgende Abwesenheiten wurden genehmigt und müssen im PO eingetragen werden:\n\n${sekrDigest.join('\n\n')}`,
                'Viele Grüße\nProf. Stefan Wagner'
            );
        } catch (e) {
            console.error(`Error sending Sekretariat Digest:`, e.message);
        }
    }

    // Finally, batch update Firestore
    if (firestoreUpdates.length > 0) {
        console.log(`Updating ${firestoreUpdates.length} Firestore documents...`);
        for (const update of firestoreUpdates) {
            await updateFirestoreDocument(update.coll, update.id, update.fields);
        }
    }

    console.log('--- Finished. ---');
}

run();
