
import React from 'react';

// This component is not used in the new view-based architecture.
// Its logic has been moved to components/views/JobEditorView.tsx.
// This file is kept to prevent build errors from old references.

const JobEditor: React.FC = () => {
  return (
    <div>
      This component is deprecated. Please use JobEditorView.
    </div>
  );
};

export default JobEditor;
