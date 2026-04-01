import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

const JSONBIN_KEY = process.env.JSONBIN_KEY;
const GMAIL_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const SEKRETARIAT_EMAIL = process.env.SEKRETARIAT_EMAIL;
const GMAIL_USER = 'dienstereminder@gmail.com';

const BINS = {
    '694548d1d0ea881f403427e3': 'https://lateina.github.io/urlaubsplaner-v2/',
    '699ffb53ae596e708f4b3de5': 'https://lateina.github.io/urlaubsplaner-v2/assistenz.html',
};

const TYPE_LABELS = { U: 'Urlaub', D: 'Dienstreise', F: 'Fortbildung', S: 'Sonstiges' };

async function fetchBin(binId) {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const data = await res.json();
    return data.record;
}

async function saveBin(binId, data) {
    await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_KEY
        },
        body: JSON.stringify(data)
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
    console.log('--- Starting Daily Email Notifications ---');
    
    if (!JSONBIN_KEY || !GMAIL_PASSWORD || !ADMIN_EMAIL || !SEKRETARIAT_EMAIL) {
        console.error('Missing environment variables!');
        process.exit(1);
    }

    const binData = {};
    const allEmployees = [];
    const binIds = Object.keys(BINS);

    // 1. Pre-fetch all bins and collect all employees from all bins
    for (const binId of binIds) {
        try {
            console.log(`Fetching Bin ${binId}...`);
            const data = await fetchBin(binId);
            binData[binId] = data;
            if (data.employees) {
                // Collect all employees into a global list for cross-bin lookups (e.g. FOAs)
                allEmployees.push(...data.employees);
            }
        } catch (err) {
            console.error(`Error fetching bin ${binId}:`, err);
        }
    }

    let adminDigest = [];
    let sekrDigest = [];

    // 2. Process each bin using the global employee pool for representatives
    for (const [binId, appUrl] of Object.entries(BINS)) {
        const data = binData[binId];
        if (!data) continue;

        console.log(`Processing Notifications for Bin ${binId}...`);
        const employeesInBin = data.employees || [];
        const requests = data.requests || [];
        let changed = false;

        for (const req of requests) {
            if (!req.notified) req.notified = {};
            
            // Requesters should be in their own bin
            const emp = employeesInBin.find(e => e.id === req.empId);
            
            // Representatives might be in a different bin (e.g. FOA representing Assistant)
            const vtr = allEmployees.find(e => e.id === req.vertreterId);
            
            const empName = emp?.name || req.empId;
            const datesStr = fmtDates(req.dates);
            const typeLabel = TYPE_LABELS[req.type] || req.type;
            const link = `\nZum Urlaubsplaner:\n${appUrl}\n`;

            // 1. Pending Vertreter -> Individual Email
            if (req.status === 'pending_vertreter' && !req.notified.pending_vertreter) {
                if (vtr?.email) {
                    await sendEmail(vtr.email, 
                        `Vertretungsanfrage von ${empName}`,
                        `Hallo ${vtr.name},\n\n${empName} beantragt ${typeLabel} (${datesStr}) und bittet dich um Zustimmung als Vertreter.${link}`
                    );
                    req.notified.pending_vertreter = true;
                    changed = true;
                }
            }

            // 2. Pending Admin -> Add to Admin Digest
            if (req.status === 'pending_admin' && !req.notified.pending_admin) {
                adminDigest.push(`• ${empName} | ${typeLabel} | ${datesStr}${req.vertreter ? ` | Vertreter: ${req.vertreter}` : ''}\n  → ${appUrl}`);
                req.notified.pending_admin = true;
                changed = true;
            }

            // 3. Approved -> Individual Email + Sekr Digest
            if (req.status === 'approved' && !req.notified.approved) {
                if (emp?.email) {
                    await sendEmail(emp.email,
                        'Dein Antrag wurde genehmigt ✓',
                        `Hallo ${empName},\n\ndein Antrag auf ${typeLabel} (${datesStr}) wurde genehmigt.${link}`
                    );
                    req.notified.approved = true;
                    changed = true;
                }
                if (!req.notified.sekretariat) {
                    sekrDigest.push(`• ${empName} | ${typeLabel} | ${datesStr}${req.vertreter ? ` | Vertreter: ${req.vertreter}` : ''}`);
                    req.notified.sekretariat = true;
                    changed = true;
                }
            }

            // 4. Rejected -> Individual Email
            if (req.status === 'rejected' && !req.notified.rejected) {
                if (emp?.email) {
                    const by = req.rejectedBy === 'vertreter' ? 'deinem Vertreter' : 'dem Leitenden Oberarzt';
                    await sendEmail(emp.email,
                        'Dein Antrag wurde abgelehnt',
                        `Hallo ${empName},\n\ndein Antrag auf ${typeLabel} (${datesStr}) wurde von ${by} abgelehnt.${req.rejectionNote ? `\nGrund: ${req.rejectionNote}` : ''}${link}`
                    );
                    req.notified.rejected = true;
                    changed = true;
                }
            }
        }

        if (changed) {
            await saveBin(binId, data);
            console.log(`  Bin ${binId} updated with notification status.`);
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
