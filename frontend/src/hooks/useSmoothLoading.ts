import { useState, useEffect, useRef } from 'react';

/**
 * 丝滑加载 Hook
 * 
 * 提供平滑的加载状态过渡：
 * - 加载时显示骨架屏（带柔和呼吸效果）
 * - 加载完成后，内容缓慢淡入（500ms）
 * - 避免闪烁，保持视觉连续性
 */
export function useSmoothLoading(isLoading: boolean, delay = 0) {
  const [showContent, setShowContent] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      // 加载完成，开始淡入过渡
      hasLoadedOnce.current = true;
      
      // 先设置 showContent，让元素渲染但透明
      setShowContent(true);
      
      // 然后延迟一帧后开始淡入动画
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay + 50); // 50ms 确保 DOM 已渲染

      return () => clearTimeout(timer);
    } else {
      // 如果重新加载，平滑淡出
      if (hasLoadedOnce.current) {
        setIsVisible(false);
        const timer = setTimeout(() => {
          setShowContent(false);
        }, 300); // 等待淡出完成
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, delay]);

  return {
    showSkeleton: isLoading || !showContent,
    showContent,
    isVisible,
    // CSS 类名辅助
    contentClass: `transition-opacity duration-500 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`,
  };
}

export default useSmoothLoading;
