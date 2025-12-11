// Simple test file to verify components can be imported and used
import React from 'react';
import RoleSelector from './components/RoleSelector';
import { UserRole } from './types/ProfileTypes';

// Test that components can be imported and basic props work
const TestComponents: React.FC = () => {
  const handleRoleChange = (role: UserRole) => {};

  return (
    <div>
      <h1>Component Test</h1>
      <RoleSelector
        currentRole="athlete"
        onRoleChange={handleRoleChange}
      />
    </div>
  );
};

export default TestComponents;