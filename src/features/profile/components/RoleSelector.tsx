import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { UserRole, roleConfigurations } from '../types/ProfileTypes';
import '../styles/RoleSelector.css';

interface RoleSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  className?: string;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentRole,
  onRoleChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen]);

  const handleRoleSelect = (role: UserRole) => {
    onRoleChange(role);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent, role: UserRole) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRoleSelect(role);
    }
  };

  const currentRoleConfig = roleConfigurations[currentRole];
  const roleOptions = Object.values(roleConfigurations);

  return (
    <div className={`role-selector ${className}`} ref={dropdownRef}>
      <button
        className={`role-dropdown ${isOpen ? 'role-dropdown-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current role: ${currentRoleConfig.displayName}. Click to change role.`}
        type="button"
      >
        <span className="role-dropdown-text">
          {currentRoleConfig.displayName}
        </span>
        <ChevronDown 
          size={16} 
          className={`role-dropdown-icon ${isOpen ? 'role-dropdown-icon-rotated' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div 
          className="role-options"
          role="listbox"
          aria-label="Select user role"
        >
          {roleOptions.map((roleConfig) => (
            <button
              key={roleConfig.role}
              className={`role-option ${roleConfig.role === currentRole ? 'role-option-selected' : ''}`}
              onClick={() => handleRoleSelect(roleConfig.role)}
              onKeyDown={(e) => handleOptionKeyDown(e, roleConfig.role)}
              role="option"
              aria-selected={roleConfig.role === currentRole}
              type="button"
            >
              {roleConfig.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoleSelector;