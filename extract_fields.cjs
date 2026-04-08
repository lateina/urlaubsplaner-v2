const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const content = fs.readFileSync('./src/data/pdfTemplate.js', 'utf8');
let base64String = content.split('=')[1].trim();
if (base64String.startsWith("'") || base64String.startsWith('"') || base64String.startsWith('`')) {
    base64String = base64String.slice(1, -1);
}
if (base64String.endsWith(';')) {
    base64String = base64String.slice(0, -1);
}
if (base64String.endsWith("'") || base64String.endsWith('"') || base64String.endsWith('`')) {
    base64String = base64String.slice(0, -1);
}

async function extract() {
    try {
        const doc = await PDFDocument.load(base64String);
        const form = doc.getForm();
        const fields = form.getFields();
        
        console.log("Urlaubs-Template Felder:");
        fields.forEach(field => {
            const type = field.constructor.name;
            const name = field.getName();
            console.log(`- ${name} [${type.replace('PDF', '')}]`);
        });
    } catch(err) {
        console.error(err);
    }
}
extract();
