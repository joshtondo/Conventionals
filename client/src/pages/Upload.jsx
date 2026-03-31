import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const styles = {
  container: { maxWidth: '600px', margin: '0 auto', padding: '32px 16px' },
  heading: { fontSize: '22px', marginBottom: '4px' },
  sub: { color: '#6b7280', fontSize: '14px', marginBottom: '24px' },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  dropzone: {
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    marginBottom: '16px',
    color: '#6b7280',
    fontSize: '14px',
  },
  fileName: { marginBottom: '16px', fontSize: '14px', color: '#374151' },
  button: {
    width: '100%',
    padding: '12px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  buttonDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  success: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
  },
  successHeading: { margin: '0 0 8px', color: '#15803d', fontSize: '16px' },
  stat: { fontSize: '14px', color: '#374151', marginBottom: '4px' },
  skipped: { marginTop: '12px', fontSize: '13px', color: '#6b7280' },
  back: {
    display: 'inline-block',
    marginBottom: '16px',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: '14px',
    background: 'none',
    border: 'none',
    padding: 0,
  },
};

export default function Upload() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected && selected.name.endsWith('.csv')) {
      setFile(selected);
      setError('');
    } else {
      setError('Please select a valid .csv file');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/events/${id}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      setResult(data);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={() => navigate('/dashboard')}>
        ← Back to Dashboard
      </button>
      <h1 style={styles.heading}>Upload Attendees</h1>
      <p style={styles.sub}>
        CSV must include columns: <code>name</code>, <code>email</code>, <code>badge_type</code>
      </p>

      <div style={styles.card}>
        {error && <div style={styles.error}>{error}</div>}

        {result && (
          <div style={styles.success}>
            <h3 style={styles.successHeading}>Upload complete</h3>
            <p style={styles.stat}>✅ Badges issued: <strong>{result.issued}</strong></p>
            <p style={styles.stat}>⏭ Skipped (duplicates): <strong>{result.skipped}</strong></p>
            {result.errors && result.errors.length > 0 && (
              <p style={styles.stat}>⚠️ Email failures: <strong>{result.errors.length}</strong></p>
            )}
            {result.skippedDetails?.length > 0 && (
              <div style={styles.skipped}>
                Skipped emails: {result.skippedDetails.map(s => s.email).join(', ')}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: result ? '16px' : 0 }}>
          <div
            style={styles.dropzone}
            onClick={() => fileInput.current?.click()}
          >
            {file ? null : 'Click to select a CSV file'}
            <input
              ref={fileInput}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <p style={styles.fileName}>
              Selected: <strong>{file.name}</strong>
            </p>
          )}

          <button
            style={{ ...styles.button, ...((!file || loading) ? styles.buttonDisabled : {}) }}
            type="submit"
            disabled={!file || loading}
          >
            {loading ? 'Uploading & sending emails…' : 'Upload & Send Badges'}
          </button>
        </form>
      </div>
    </div>
  );
}
