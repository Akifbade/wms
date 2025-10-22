import React from 'react';

const DeprecatedDashboardView: React.FC = () => {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#fecaca', color: '#991b1b', border: '2px solid #dc2626', borderRadius: '0.5rem' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Error: Deprecated Component Loaded</h1>
      <p style={{ marginTop: '0.5rem' }}>
        This component at <code>components/DashboardView.tsx</code> is a placeholder and should not be used.
        <br />
        The correct component is located at <strong><code>components/views/DashboardView.tsx</code></strong>.
        <br />
        Please check your import statements.
      </p>
    </div>
  );
};

export default DeprecatedDashboardView;
