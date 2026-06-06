import React, { useState } from 'react';
import Modal from './Modal';
import { firestoreService } from '../../services/firestoreService';
import toast from 'react-hot-toast';

const BugReportModal = ({ isOpen, onClose, currentUser }) => {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const report = {
        message: description,
        user: currentUser ? `${currentUser.id} (${currentUser.name})` : 'Unbekannt',
        userAgent: navigator.userAgent,
        url: window.location.href,
        planerType: localStorage.getItem('last_planer_type') || 'unknown'
      };
      
      await firestoreService.submitBugReport(report);
      toast.success('Fehlerbericht erfolgreich gesendet!');
      setDescription('');
      onClose();
    } catch (err) {
      toast.error('Senden fehlgeschlagen. Bitte später erneut versuchen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fehler melden / Feedback">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '300px' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
          Gibt es ein technisches Problem oder einen Verbesserungsvorschlag? Bitte beschreibe es so genau wie möglich (welche Seite, welche Aktion, was passiert ist).
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ich habe versucht Urlaube einzutragen, aber..."
          required
          style={{
            minHeight: '120px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            resize: 'vertical'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || !description.trim()}
          >
            {isSubmitting ? 'Sendet...' : 'Senden'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BugReportModal;
