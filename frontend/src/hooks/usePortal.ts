import { useState, useEffect } from 'react';

/**
 * Hook to create and manage a portal container element
 * @param containerId - The ID for the portal container
 * @returns The container element or null
 * 
 * @example
 * const container = usePortal('modal-root');
 * if (container) {
 *   return createPortal(<Modal />, container);
 * }
 */
const usePortal = (containerId: string = 'portal-root'): HTMLElement | null => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let element = document.getElementById(containerId);
    let created = false;
    
    if (!element) {
      element = document.createElement('div');
      element.id = containerId;
      element.setAttribute('aria-live', 'polite');
      document.body.appendChild(element);
      created = true;
    }
    
    setContainer(element);

    return () => {
      if (created && element && element.childNodes.length === 0) {
        element.remove();
      }
    };
  }, [containerId]);

  return container;
};

export default usePortal;
