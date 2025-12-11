import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  containerId?: string;
  className?: string;
}

/**
 * Portal Component
 * 
 * Renders children into a DOM node outside of the parent component's DOM hierarchy.
 * Useful for modals, tooltips, and other overlay components that need to escape
 * their container's styling constraints.
 */
const Portal: React.FC<PortalProps> = ({ 
  children, 
  containerId = 'portal-root',
  className 
}) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Try to find existing container
    let portalContainer = document.getElementById(containerId);
    
    // Create container if it doesn't exist
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = containerId;
      
      // Add optional className
      if (className) {
        portalContainer.className = className;
      }
      
      // Append to body
      document.body.appendChild(portalContainer);
    }
    
    setContainer(portalContainer);
    
    // Cleanup function - only remove if we created it
    return () => {
      if (portalContainer && portalContainer.id === containerId && !portalContainer.hasChildNodes()) {
        document.body.removeChild(portalContainer);
      }
    };
  }, [containerId, className]);

  // Don't render until container is ready
  if (!container) {
    return null;
  }

  return ReactDOM.createPortal(children, container);
};

export default Portal;