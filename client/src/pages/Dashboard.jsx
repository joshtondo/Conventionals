import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const s = {
  container: { maxWidth: '960px', margin: '0 auto', padding: '32px 16px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  heading: { margin: 0, fontSize: '24px' },
  row: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  card: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', marginBottom: '16px' },
  btn: { padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  outlineBtn: { padding: '7px 14px', background: '#fff', color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  dangerBtn: { padding: '5px 12px', background: '#fff', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  smallBtn: { padding: '5px 12px', background: '#fff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  select: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: '#fff', cursor: 'pointer' },
  input: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%' },
  label: { fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px', display: 'block' },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '20px' },
  statBox: { flex: 1, background: '#f9fafb', borderRadius: '10px', padding: '14px 18px', textAlign: 'center' },
  statNum: { fontSize: '32px', fontWeight: '700', color: '#111827', lineHeight: 1 },
  statLabel: { fontSize: '12px', color: '#6b7280', marginTop: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  checkedInPill: { display: 'inline-block', background: '#f0fdf4', color: '#15803d', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: '500' },
  pendingPill: { display: 'inline-block', background: '#f9fafb', color: '#9ca3af', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' },
  errPill: { display: 'inline-block', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' },
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', marginBottom: '12px' },
  success: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', marginBottom: '12px' },
  empty: { color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '28px 0' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' },
  sectionTitle: { margin: '0 0 14px', fontSize: '16px', fontWeight: '600' },
  divider: { border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' },
};

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Dashboard() {
  const navigate = useNavigate();

  // Events
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState('');

  // Attendees & stats
  const [stats, setStats] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Manual add attendee form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addBadgeType, setAddBadgeType] = useState('General');
  const [addingAttendee, setAddingAttendee] = useState(false);
  const [addResult, setAddResult] = useState(null); // { success, message }

  // Per-row resend state: token -> 'sending' | 'sent' | 'error'
  const [resendState, setResendState] = useState({});

  // Load events list on mount
  useEffect(() => {
    fetch('/api/events', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setEvents(data);
        if (data.length > 0) setSelectedEventId(data[0].id);
      })
      .catch(() => setLoadError('Failed to load events.'));
  }, []);

  const fetchEventData = useCallback(async () => {
    if (!selectedEventId) return;
    setLoadError('');
    try {
      const [statsRes, attendeesRes] = await Promise.all([
        fetch(`/api/events/${selectedEventId}/stats`, { credentials: 'include' }),
        fetch(`/api/events/${selectedEventId}/attendees`, { credentials: 'include' }),
      ]);
      if (!statsRes.ok || !attendeesRes.ok) { setLoadError('Failed to load event data.'); return; }
      const [statsData, attendeesData] = await Promise.all([statsRes.json(), attendeesRes.json()]);
      setStats(statsData);
      setAttendees(attendeesData);
    } catch {
      setLoadError('Network error — please refresh.');
    }
  }, [selectedEventId]);

  useEffect(() => {
    setStats(null);
    setAttendees([]);
    setAddResult(null);
    setShowAddForm(false);
    fetchEventData();
  }, [fetchEventData]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/login');
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    if (!newEventName.trim()) return;
    setCreatingEvent(true);
    setCreateEventError('');
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newEventName.trim(), event_date: newEventDate || null }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateEventError(data.error || 'Failed to create event'); return; }
      setEvents(prev => [data, ...prev]);
      setSelectedEventId(data.id);
      setNewEventName('');
      setNewEventDate('');
      setShowNewEventForm(false);
    } catch {
      setCreateEventError('Network error');
    } finally {
      setCreatingEvent(false);
    }
  }

  async function handleAddAttendee(e) {
    e.preventDefault();
    setAddingAttendee(true);
    setAddResult(null);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: addName, email: addEmail, badge_type: addBadgeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddResult({ success: false, message: data.error || 'Failed to add attendee' });
        return;
      }
      setAddResult({
        success: true,
        message: `${data.name} added.${data.emailSent ? ' Badge email sent.' : ' Email failed — badge saved.'}`,
      });
      setAddName('');
      setAddEmail('');
      setAddBadgeType('General');
      fetchEventData();
    } catch {
      setAddResult({ success: false, message: 'Network error' });
    } finally {
      setAddingAttendee(false);
    }
  }

  async function handleResend(token) {
    setResendState(prev => ({ ...prev, [token]: 'sending' }));
    try {
      const res = await fetch(`/api/badges/${token}/resend`, {
        method: 'POST',
        credentials: 'include',
      });
      setResendState(prev => ({ ...prev, [token]: res.ok ? 'sent' : 'error' }));
      if (res.ok) fetchEventData();
    } catch {
      setResendState(prev => ({ ...prev, [token]: 'error' }));
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div style={s.container}>
      {/* Top bar */}
      <div style={s.topBar}>
        <h1 style={s.heading}>Dashboard</h1>
        <button style={s.btn} onClick={handleLogout}>Sign out</button>
      </div>

      {/* Event selector */}
      <div style={s.card}>
        <div style={{ ...s.row, justifyContent: 'space-between', marginBottom: showNewEventForm ? '16px' : 0 }}>
          <div style={s.row}>
            <select
              style={s.select}
              value={selectedEventId || ''}
              onChange={e => setSelectedEventId(Number(e.target.value))}
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
              {events.length === 0 && <option disabled>No events yet</option>}
            </select>
            {selectedEvent?.event_date && (
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(selectedEvent.event_date)}</span>
            )}
          </div>
          <div style={s.row}>
            <button style={s.outlineBtn} onClick={() => { setShowNewEventForm(v => !v); setCreateEventError(''); }}>
              {showNewEventForm ? 'Cancel' : '+ New Event'}
            </button>
          </div>
        </div>

        {showNewEventForm && (
          <form onSubmit={handleCreateEvent}>
            {createEventError && <div style={s.error}>{createEventError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={s.label}>Event Name</label>
                <input style={s.input} value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="Convention 2027" required />
              </div>
              <div>
                <label style={s.label}>Date (optional)</label>
                <input style={s.input} type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
              </div>
              <button style={s.btn} type="submit" disabled={creatingEvent}>
                {creatingEvent ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Event detail card */}
      {selectedEventId && (
        <div style={s.card}>
          {/* Actions row */}
          <div style={{ ...s.row, justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>{selectedEvent?.name}</h2>
            <div style={s.row}>
              <button style={s.outlineBtn} onClick={fetchEventData}>Refresh</button>
              <button style={s.btn} onClick={() => navigate(`/event/${selectedEventId}/upload`)}>
                Upload CSV →
              </button>
            </div>
          </div>

          {loadError && <div style={s.error}>{loadError}</div>}

          {/* Stats */}
          {stats && (
            <div style={s.statsRow}>
              <div style={s.statBox}>
                <div style={s.statNum}>{stats.total}</div>
                <div style={s.statLabel}>Total Attendees</div>
              </div>
              <div style={s.statBox}>
                <div style={{ ...s.statNum, color: '#15803d' }}>{stats.checkedIn}</div>
                <div style={s.statLabel}>Checked In</div>
              </div>
              <div style={s.statBox}>
                <div style={{ ...s.statNum, color: '#6b7280' }}>
                  {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
                </div>
                <div style={s.statLabel}>Attendance Rate</div>
              </div>
            </div>
          )}

          <hr style={s.divider} />

          {/* Add attendee */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ ...s.row, justifyContent: 'space-between', marginBottom: showAddForm ? '12px' : 0 }}>
              <p style={s.sectionTitle}>Attendees</p>
              <button style={s.outlineBtn} onClick={() => { setShowAddForm(v => !v); setAddResult(null); }}>
                {showAddForm ? 'Cancel' : '+ Add Attendee'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddAttendee} style={{ marginBottom: '16px' }}>
                {addResult && (
                  <div style={addResult.success ? s.success : s.error}>{addResult.message}</div>
                )}
                <div style={s.formGrid}>
                  <div>
                    <label style={s.label}>Name</label>
                    <input style={s.input} value={addName} onChange={e => setAddName(e.target.value)} placeholder="Jane Smith" required />
                  </div>
                  <div>
                    <label style={s.label}>Email</label>
                    <input style={s.input} type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="jane@example.com" required />
                  </div>
                  <div>
                    <label style={s.label}>Badge Type</label>
                    <select style={{ ...s.select, width: '100%' }} value={addBadgeType} onChange={e => setAddBadgeType(e.target.value)}>
                      <option>General</option>
                      <option>VIP</option>
                      <option>Staff</option>
                      <option>Speaker</option>
                      <option>Press</option>
                    </select>
                  </div>
                  <button style={s.btn} type="submit" disabled={addingAttendee}>
                    {addingAttendee ? 'Adding…' : 'Add & Send'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Attendee table */}
          <div style={{ overflowX: 'auto' }}>
            {attendees.length === 0 && !loadError ? (
              <div style={s.empty}>No attendees yet. Upload a CSV or add one above.</div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Name</th>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Badge Type</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Check-in</th>
                    <th style={s.th}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map(a => {
                    const rs = resendState[a.token];
                    return (
                      <tr key={a.id}>
                        <td style={s.td}>{a.name}</td>
                        <td style={{ ...s.td, color: '#6b7280' }}>{a.email}</td>
                        <td style={s.td}>{a.badge_type}</td>
                        <td style={s.td}>
                          {a.checked_in
                            ? <span style={s.checkedInPill}>Checked in</span>
                            : <span style={s.pendingPill}>Not yet</span>}
                        </td>
                        <td style={s.td}>{a.checked_in ? formatTime(a.checked_in_at) : '—'}</td>
                        <td style={s.td}>
                          {rs === 'sent' && <span style={s.checkedInPill}>Sent</span>}
                          {rs === 'error' && <span style={s.errPill}>Failed</span>}
                          {rs !== 'sent' && rs !== 'error' && (
                            <button
                              style={s.smallBtn}
                              onClick={() => handleResend(a.token)}
                              disabled={rs === 'sending'}
                            >
                              {rs === 'sending' ? 'Sending…' : 'Resend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
