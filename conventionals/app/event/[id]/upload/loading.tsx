export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #e0e7ff',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }} />
    </div>
  )
}
