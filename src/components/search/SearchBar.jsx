export default function SearchBar() {
  return (
    <div style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>
      <input
        type="text"
        name="q"
        placeholder="Search..."
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '28px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          color: '#111827',
          boxSizing: 'border-box',
          boxShadow: '0 6px 18px rgba(15,23,42,0.08)'
        }}
      />
    </div>
  )
}