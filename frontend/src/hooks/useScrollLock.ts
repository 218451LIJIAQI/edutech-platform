import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to lock/unlock body scroll
 * Useful for modals, drawers, and overlay components
 * 
 * @param lock - Whether to lock the scroll
 * 
 * @example
 * useScrollLock(isModalOpen);
 * 
 * @example
 * const { lock, unlock, isLocked } = useScrollLock();
 * // Manually control scroll lock
 * lock();
 * unlock();
 */
const useScrollLock = (lock?: boolean) => {
  const scrollPositionRef = useRef(0);
  const isLockedRef = useRef(false);

  const lockScroll = useCallback(() => {
    if (isLockedRef.current) return;
    
    // Store current scroll position
    scrollPositionRef.current = window.scrollY;
    
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Lock scroll
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPositionRef.current}px`;
    document.body.style.width = '100%';
    
    isLockedRef.current = true;
  }, []);

  const unlockScroll = useCallback(() => {
    if (!isLockedRef.current) return;
    
    // Restore scroll
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    
    // Restore scroll position
    window.scrollTo(0, scrollPositionRef.current);
    
    isLockedRef.current = false;
  }, []);

  // Auto lock/unlock based on `lock` parameter
  useEffect(() => {
    if (lock === undefined) return;
    
    if (lock) {
      lockScroll();
    } else {
      unlockScroll();
    }

    return () => {
      unlockScroll();
    };
  }, [lock, lockScroll, unlockScroll]);

  return {
    lock: lockScroll,
    unlock: unlockScroll,
    isLocked: isLockedRef.current,
  };
};

export default useScrollLock;
