import React, { useState } from 'react';
import API from '../../services/api';

// NON-VIZ #1 - generate + download day-of timeline as a text "PDF"-style document.
function DayOfTimelinePDF() {
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await API.get('/custom-views/day-of-timeline-pdf');
      setDoc(data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  const download = () => {
    if (!doc) return;
    const blob = new Blob([doc.content], { type: doc.mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="nonviz-timeline-pdf" style={{ padding: '12px 4px' }}>
      <h3 style={{ marginBottom: 8 }}>Day-Of Timeline (Printable PDF)</h3>
      <p style={{ fontSize: '.9rem', color: '#666', marginBottom: 12 }}>
        Generate a printable, vendor-ready timeline document from your saved timeline items.
      </p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={generate} disabled={loading} data-testid="btn-generate-pdf">
          {loading ? 'Generating...' : 'Generate Timeline Document'}
        </button>
        {doc && (
          <button className="btn btn-outline" onClick={download} data-testid="btn-download-pdf">
            Download ({doc.filename})
          </button>
        )}
      </div>
      {err && <div className="login-error">Error: {err}</div>}
      {doc && (
        <>
          <div style={{ fontSize: '.8rem', color: '#888', marginBottom: 6 }}>
            {doc.item_count} item(s) &middot; {doc.bytes} bytes &middot; generated {new Date(doc.generated_at).toLocaleString()}
          </div>
          <pre data-testid="pdf-preview" style={{
            background: '#1f1b24', color: '#eee', padding: 16,
            fontSize: '.78rem', borderRadius: 6,
            maxHeight: 380, overflow: 'auto', whiteSpace: 'pre',
          }}>{doc.content}</pre>
        </>
      )}
    </div>
  );
}

export default DayOfTimelinePDF;
