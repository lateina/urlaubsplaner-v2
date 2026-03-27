import React from 'react';
import Modal from './Modal';

const LegalModal = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Impressum & Datenschutz">
      <div style={{ color: 'var(--text-main)', lineHeight: 1.6, fontSize: '0.9rem' }}>
        
        {/* --- Impressum --- */}
        <section style={{ marginBottom: '32px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
            Impressum
          </h4>
          <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Angaben gemäß § 5 TMG / § 18 MStV</p>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>Betreiber & Verantwortlich:</p>
            <p style={{ margin: 0 }}>
              Prof. Dr. Stefan Wagner<br />
              Klinik und Poliklinik für Innere Medizin II<br />
              Universitätsklinikum Regensburg<br />
              Franz-Josef-Strauß-Allee 11<br />
              93053 Regensburg
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>Kontakt:</p>
            <p style={{ margin: 0 }}>E-Mail: [E-Mail-Adresse]</p>
            <p style={{ margin: 0 }}>Telefon: [Telefonnummer]</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>Gesetzliche Berufsbezeichnung:</p>
            <p style={{ margin: 0 }}>Berufsbezeichnung: Arzt (verliehen in der Bundesrepublik Deutschland)</p>
            <p style={{ margin: 0 }}>Zuständige Kammer: Bayerische Landesärztekammer (BLÄK), Mühlbaurstraße 16, 81677 München</p>
            <p style={{ margin: 0 }}>Zuständige Aufsichtsbehörde: Regierung von Oberpfalz, Emmeramsplatz 8, 93047 Regensburg</p>
          </div>

          <div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>Berufsrechtliche Regelungen:</p>
            <p style={{ margin: 0 }}>
              Es gelten folgende berufsrechtliche Regelungen, einzusehen auf 
              <a href="https://www.blaek.de" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>www.blaek.de</a>:
            </p>
            <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
              <li>Berufsordnung für die Ärzte Bayerns</li>
              <li>Heilberufe-Kammergesetz (HKG) des Bundeslandes Bayern</li>
            </ul>
          </div>
        </section>

        {/* --- Datenschutzerklärung --- */}
        <section style={{ marginBottom: '32px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
            Datenschutzerklärung
          </h4>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>1. Verantwortlicher</p>
            <p style={{ margin: 0 }}>
              Prof. Dr. Stefan Wagner, Klinik und Poliklinik für Innere Medizin II<br />
              93053 Regensburg
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>2. Datenverarbeitung</p>
            <p style={{ margin: 0 }}>Bei Nutzung dieses Tools werden verarbeitet:</p>
            <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
              <li><strong>Identifikationsdaten:</strong> Name, Vorname, dienstliche E-Mail-Adresse</li>
              <li><strong>Planungsdaten:</strong> Abwesenheitszeiträume (Urlaub, Fortbildung etc.), Status der Genehmigung</li>
              <li><strong>Technische Daten:</strong> IP-Adresse und Zugriffszeitpunkt (Logging durch Hoster)</li>
            </ul>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>3. Zweck und Rechtsgrundlage</p>
            <p style={{ margin: 0 }}>
              Zweck ist die Digitalisierung des abteilungsinternen Urlaubsantragswesens zur Vorbereitung 
              der Dienstplanung und Übertragung in das Hauptsystem "Personal Office".
            </p>
            <p style={{ margin: '8px 0 0 0' }}>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (§ 26 BDSG) 
              sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an effizienter Stationsorganisation).
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>4. Hosting und Datensicherheit</p>
            <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
              <li><strong>Frontend:</strong> GitHub Pages (GitHub Inc., USA). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</li>
              <li><strong>Datenbank:</strong> JSONBin.io (Daten werden verschlüsselt gespeichert).</li>
              <li><strong>Verschlüsselung:</strong> Die Übertragung erfolgt via HTTPS.</li>
            </ul>
          </div>

          <div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>5. Speicherdauer & Rechte</p>
            <p style={{ margin: 0 }}>
              Daten werden gelöscht, sobald sie für die Planung nicht mehr erforderlich sind 
              (i.d.R. nach Abschluss des Kalenderjahres), sofern keine Aufbewahrungspflichten bestehen. 
              Nutzer haben das Recht auf Auskunft, Berichtigung, Löschung und Widerspruch.
            </p>
          </div>
        </section>

        {/* --- Disclaimer --- */}
        <section style={{ padding: '20px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 800 }}>
            Status dieses Planungstools (Disclaimer)
          </h4>
          <p style={{ margin: '0 0 12px 0' }}>
            <strong>Wichtiger Hinweis zum Genehmigungsprozess:</strong> Dieses Tool dient der digitalen Vorplanung 
            innerhalb der Abteilung und ersetzt den bisherigen papierbasierten Workflow.
          </p>
          <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
            <li><strong>Vorentscheidung:</strong> Die Einträge stellen eine interne Abstimmung dar.</li>
            <li><strong>Verbindlichkeit:</strong> Die finale, rechtlich bindende Genehmigung des Urlaubs erfolgt ausschließlich durch die Übertragung und Bestätigung in der offiziellen Software "Personal Office".</li>
          </ul>
          <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>
            <strong>Einwilligung:</strong> Mit der Nutzung erklären Sie sich einverstanden, dass Ihre Daten zweckgebunden 
            auf GitHub/JSONBin.io verarbeitet werden.
          </p>
        </section>

      </div>
    </Modal>
  );
};

export default LegalModal;
