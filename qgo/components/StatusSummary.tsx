import React from 'react';

const DeprecatedStatusSummary: React.FC = () => {
  return (
    <div style={{ padding: '1rem', backgroundColor: '#fecaca', color: '#991b1b', border: '1px solid #dc2626' }}>
      <strong>Error:</strong> This component at <code>components/StatusSummary.tsx</code> is deprecated.
      Use the one from <strong><code>components/views/dashboard/StatusSummary.tsx</code></strong>.
    </div>
  );
};

export default DeprecatedStatusSummary;
