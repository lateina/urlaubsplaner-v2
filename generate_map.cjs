const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

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
        const pages = doc.getPages();
        const firstPage = pages[0];
        
        fields.forEach(field => {
            const type = field.constructor.name;
            const name = field.getName();
            
            if (type === 'PDFTextField') {
                try {
                    form.getTextField(name).setText('=> ' + name);
                } catch(e) {}
            } else if (type === 'PDFCheckBox') {
                try {
                    const cb = form.getCheckBox(name);
                    cb.check();
                    
                    const widgets = cb.acroField.getWidgets();
                    if (widgets && widgets.length > 0) {
                        const rect = widgets[0].getRectangle();
                        firstPage.drawText('=> ' + name, {
                            x: rect.x + rect.width + 5,
                            y: rect.y + 2,
                            size: 8,
                            color: rgb(1, 0, 0) // Rot zur besseren Unterscheidung
                        });
                    }
                } catch(e) {
                     console.error("Fehler bei Checkbox", name, e);
                }
            }
        });

        const pdfBytes = await doc.save();
        fs.writeFileSync('./Urlaubs-Template-Map.pdf', pdfBytes);
        console.log("PDF Map generated as Urlaubs-Template-Map.pdf");
    } catch(err) {
        console.error(err);
    }
}
extract();
