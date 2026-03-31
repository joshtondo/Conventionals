import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const styles = {
  container: { maxWidth: '480px', margin: '48px auto', padding: '0 16px' },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    textAlign: 'center',
  },
  eventName: { fontSize: '13px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  name: { fontSize: '32px', fontWeight: '700', margin: '12px 0 8px' },
  badgePill: {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: '999px',
    background: '#ede9fe',
    color: '#5b21b6',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '28px',
  },
  divider: { borderTop: '1px solid #e5e7eb', margin: '24px 0' },
  checkedInTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#15803d',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '15px',
    fontWeight: '500',
  },
  alreadyTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#fefce8',
    border: '1px solid #fde68a',
    color: '#92400e',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '15px',
    fontWeight: '500',
  },
  checkinBtn: {
    padding: '12px 28px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  authNote: { fontSize: '13px', color: '#9ca3af', marginTop: '10px' },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
  },
};

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Badge() {
  const { token } = useParams();
  const [badge, setBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInState, setCheckInState] = useState(null); // null | 'done' | 'already'
  const [checkInError, setCheckInError] = useState('');

  useEffect(() => {
    fetch(`/api/badges/${token}`)
      .then(res => res.ok ? res.json() : res.json().then(d => Promise.reject(d.error)))
      .then(data => setBadge(data))
      .catch(err => setError(typeof err === 'string' ? err : 'Failed to load badge'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCheckIn() {
    setCheckingIn(true);
    setCheckInError('');
    try {
      const res = await fetch(`/api/badges/${token}/checkin`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.status === 401) {
        setCheckInError('Staff login required to check in.');
        return;
      }
      if (!res.ok) {
        setCheckInError(data.error || 'Check-in failed');
        return;
      }
      if (data.alreadyCheckedIn) {
        setCheckInState('already');
      } else {
        setBadge(b => ({ ...b, checked_in: true, checked_in_at: data.checkedInAt }));
        setCheckInState('done');
      }
    } catch {
      setCheckInError('Network error — please try again');
    } finally {
      setCheckingIn(false);
    }
  }

  if (loading) return null;

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, ...styles.error }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.eventName}>{badge.event_name}</div>
        <div style={styles.name}>{badge.name}</div>
        <div style={styles.badgePill}>{badge.badge_type}</div>

        <div style={styles.divider} />

        {badge.checked_in ? (
          <div style={styles.checkedInTag}>
            ✓ Checked in{badge.checked_in_at ? ` at ${formatTime(badge.checked_in_at)}` : ''}
          </div>
        ) : (
          <>
            {checkInState === 'already' && (
              <div style={{ ...styles.alreadyTag, marginBottom: '12px' }}>
                Already checked in
              </div>
            )}
            {checkInState !== 'already' && (
              <button
                style={styles.checkinBtn}
                onClick={handleCheckIn}
                disabled={checkingIn}
              >
                {checkingIn ? 'Checking in…' : 'Check In'}
              </button>
            )}
            {checkInError && (
              <p style={{ ...styles.authNote, color: '#b91c1c' }}>{checkInError}</p>
            )}
            {!checkInError && (
              <p style={styles.authNote}>Staff only</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
