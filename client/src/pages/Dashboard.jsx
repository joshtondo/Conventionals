import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Event ID is always 1 — the seeder always creates event 1
const EVENT_ID = 1;

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '32px 16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  heading: { margin: 0, fontSize: '24px' },
  button: {
    padding: '8px 16px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  outlineButton: {
    padding: '6px 14px',
    background: '#fff',
    color: '#4f46e5',
    border: '1px solid #4f46e5',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
    marginBottom: '16px',
  },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px' },
  statBox: {
    flex: 1,
    background: '#f9fafb',
    borderRadius: '10px',
    padding: '16px 20px',
    textAlign: 'center',
  },
  statNum: { fontSize: '36px', fontWeight: '700', color: '#111827', lineHeight: 1 },
  statLabel: { fontSize: '13px', color: '#6b7280', marginTop: '4px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    borderBottom: '2px solid #e5e7eb',
    color: '#6b7280',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  checkedInTag: {
    display: 'inline-block',
    background: '#f0fdf4',
    color: '#15803d',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '500',
  },
  pendingTag: {
    display: 'inline-block',
    background: '#f9fafb',
    color: '#9ca3af',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '12px',
  },
  rowActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { margin: '0 0 16px', fontSize: '18px' },
  empty: { color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '32px 0' },
};

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadError, setLoadError] = useState('');

  const fetchData = useCallback(async () => {
    setLoadError('');
    try {
      const [statsRes, attendeesRes] = await Promise.all([
        fetch(`/api/events/${EVENT_ID}/stats`, { credentials: 'include' }),
        fetch(`/api/events/${EVENT_ID}/attendees`, { credentials: 'include' }),
      ]);

      if (!statsRes.ok || !attendeesRes.ok) {
        setLoadError('Failed to load event data.');
        return;
      }

      const [statsData, attendeesData] = await Promise.all([
        statsRes.json(),
        attendeesRes.json(),
      ]);

      setStats(statsData);
      setAttendees(attendeesData);
    } catch {
      setLoadError('Network error — please refresh.');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/login');
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Dashboard</h1>
        <button style={styles.button} onClick={handleLogout}>Sign out</button>
      </div>

      <div style={styles.card}>
        <div style={styles.rowActions}>
          <h2 style={{ ...styles.cardTitle, marginBottom: 0 }}>Convention 2026</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={styles.outlineButton} onClick={fetchData}>Refresh</button>
            <button style={styles.button} onClick={() => navigate(`/event/${EVENT_ID}/upload`)}>
              Upload Attendees →
            </button>
          </div>
        </div>

        {loadError && (
          <p style={{ color: '#b91c1c', fontSize: '14px', marginTop: '16px' }}>{loadError}</p>
        )}

        {stats && (
          <div style={{ ...styles.statsRow, marginTop: '20px' }}>
            <div style={styles.statBox}>
              <div style={styles.statNum}>{stats.total}</div>
              <div style={styles.statLabel}>Total Attendees</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statNum, color: '#15803d' }}>{stats.checkedIn}</div>
              <div style={styles.statLabel}>Checked In</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statNum, color: '#6b7280' }}>
                {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
              </div>
              <div style={styles.statLabel}>Attendance Rate</div>
            </div>
          </div>
        )}

        <div style={{ ...styles.tableWrap, marginTop: '8px' }}>
          {attendees.length === 0 && !loadError ? (
            <div style={styles.empty}>No attendees yet. Upload a CSV to get started.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Badge Type</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Check-in Time</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map(a => (
                  <tr key={a.id}>
                    <td style={styles.td}>{a.name}</td>
                    <td style={styles.td}>{a.badge_type}</td>
                    <td style={styles.td}>
                      {a.checked_in
                        ? <span style={styles.checkedInTag}>Checked in</span>
                        : <span style={styles.pendingTag}>Not yet</span>}
                    </td>
                    <td style={styles.td}>{a.checked_in ? formatTime(a.checked_in_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
