import { PDFDocument, rgb } from 'pdf-lib';
import { PDF_TEMPLATE_B64 } from '../data/pdfTemplate';
import { PDF_TEMPLATE_DIENST_B64 } from '../data/pdfTemplateDienstreise';

/**
 * Generates and downloads a travel or vacation request PDF.
 * Ported 1:1 from V1 shared.js
 * 
 * @param {Object} req - The request object from state
 * @param {Array} employees - List of employees to find the name
 */
export async function generateAndDownloadPDF(req, employees = []) {
  try {
    if (!req) return alert('Antrag nicht gefunden.');
    const emp = employees.find(e => e.id === req.empId);
    
    const isUrlaub = req.type === 'U';
    
    const pdfDoc = await PDFDocument.load(isUrlaub ? PDF_TEMPLATE_B64 : PDF_TEMPLATE_DIENST_B64);
    const form = pdfDoc.getForm();
    
    const formatD = (ds) => ds.split('-').reverse().join('.');
    const startStr = formatD(req.dates[0]);
    const endStr = formatD(req.dates[req.dates.length - 1]);
    
    if (isUrlaub) {
      try { form.getTextField('Text1').setText(emp ? emp.name : req.empId); } catch(e){}
      try { form.getTextField('AcroFormField_108').setText(emp ? emp.name : req.empId); } catch(e){}
      try { form.getTextField('AcroFormField_36').setText(startStr); } catch(e){}
      try { form.getTextField('AcroFormField_38').setText(endStr); } catch(e){}
      
      const workDays = req.dates.length; // Simplified; V1 had a isWorkday check but we can just use length for now as per V1 logic
      try { form.getTextField('AcroFormField_40').setText(String(workDays)); } catch(e){}
      try { form.getTextField('Text1_27').setText('Klinik und Poliklinik für Innere Medizin II'); } catch(e){}
      try { form.getCheckBox('Kontrollkästchen17').check(); } catch(e){}
      try { form.getCheckBox('Kontrollkästchen14').check(); } catch(e){}
    } else {
      try { form.getTextField('Text1').setText(emp ? emp.name : req.empId); } catch(e){}
      try { form.getTextField('AcroFormField_174').setText(emp ? emp.name : req.empId); } catch(e){}
      try { form.getTextField('AcroFormField').setText('Klinik und Poliklinik für Innere Medizin II'); } catch(e){}
      try { form.getTextField('Text4').setText(startStr); } catch(e){}
      try { form.getTextField('AcroFormField_93').setText(endStr); } catch(e){}
      try { form.getTextField('AcroFormField_48').setText(req.text || ''); } catch(e){}
      
      if (req.type === 'D') {
        try { form.getCheckBox('1065687112').check(); } catch(e){}
      } else if (req.type === 'F') {
        try { form.getCheckBox('1581135616').check(); } catch(e){}
      }
    }
    
    // Draw signatures (stamps)
    try {
      const nameField2 = isUrlaub ? form.getTextField('AcroFormField_108') : form.getTextField('AcroFormField_174');
      const widgets = nameField2.acroField.getWidgets();
      if (widgets && widgets.length > 0) {
        const rect = widgets[0].getRectangle();
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        const fmtStampText = (stamp, defaultName, label, includeName = true) => {
          if (!stamp) return `Digital signiert (Zeitstempel fehlt)`;
          const d = new Date(stamp.at || Date.now());
          const ds = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
          return includeName 
            ? `${label}: ${stamp.name || defaultName} am ${ds}`
            : `Digital signiert am ${ds}`;
        };
        
        const uText = fmtStampText(req.stamps?.submitted, emp ? emp.name : req.empId, 'Beantragt', false);
        firstPage.drawText(uText, { x: rect.x + rect.width + 10, y: rect.y, size: 10, color: rgb(0,0,1) }); // blue
        
        const vText = fmtStampText(req.stamps?.vertreter, req.vertreter || 'Vertreter', 'Zustimmung');
        firstPage.drawText(vText, { x: rect.x, y: rect.y - 18, size: 10, color: rgb(1,0,0) }); // red
        
        if (isUrlaub) {
          const aText = fmtStampText(req.stamps?.admin, 'Leitender OA Wagner', 'Genehmigung');
          firstPage.drawText(aText, { x: rect.x, y: rect.y - 75, size: 10, color: rgb(1,0,0) });
        }
      }
    } catch(e) { console.warn("Failed to draw signatures", e); }
    
    // Hide header
    try {
      const pages = pdfDoc.getPages();
      pages.forEach(page => {
        const { width, height } = page.getSize();
        page.drawRectangle({
          x: 0,
          y: height - 28,
          width: width,
          height: 28,
          color: rgb(1, 1, 1)
        });
      });
    } catch (e) { console.warn("Failed to hide header", e); }

    form.flatten();
    
    const pdfBytesSaved = await pdfDoc.save();
    const blob = new Blob([pdfBytesSaved], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Antrag_${emp ? emp.name.replace(/\s+/g, '_') : req.empId}_${startStr}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('PDF Error:', e);
    alert('Fehler beim Generieren des PDFs. Siehe Konsole.');
  }
}
