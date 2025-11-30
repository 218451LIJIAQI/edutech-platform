import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  /** Content to render in the portal */
  children: ReactNode;
  /** Custom container ID (defaults to 'portal-root') */
  containerId?: string;
  /** Whether to create container if it doesn't exist */
  createContainer?: boolean;
}

/**
 * Portal Component
 * Renders children into a DOM node outside the parent component hierarchy
 * Useful for modals, tooltips, dropdowns, and notifications
 * 
 * @example
 * <Portal>
 *   <Modal>Modal content</Modal>
 * </Portal>
 * 
 * @example
 * <Portal containerId="tooltip-root">
 *   <Tooltip>Tooltip content</Tooltip>
 * </Portal>
 */
const Portal = ({ 
  children, 
  containerId = 'portal-root',
  createContainer = true 
}: PortalProps) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let element = document.getElementById(containerId);
    
    if (!element && createContainer) {
      element = document.createElement('div');
      element.id = containerId;
      element.setAttribute('aria-live', 'polite');
      document.body.appendChild(element);
    }
    
    setContainer(element);

    return () => {
      // Only remove the container if we created it and it's empty
      if (element && createContainer && element.childNodes.length === 0) {
        element.remove();
      }
    };
  }, [containerId, createContainer]);

  if (!container) return null;

  return createPortal(children, container);
};

export default Portal;
