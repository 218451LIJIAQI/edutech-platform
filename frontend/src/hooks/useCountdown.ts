import { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const calculateTimeLeft = (targetDate: Date | string | number): TimeLeft => {
  const difference = new Date(targetDate).getTime() - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
};

/**
 * Hook for countdown timer logic
 * 
 * @param targetDate - The target date to count down to
 * @param onComplete - Callback when countdown reaches zero
 * 
 * @example
 * const { days, hours, minutes, seconds, isComplete } = useCountdown(
 *   new Date('2024-12-31'),
 *   () => console.log('Happy New Year!')
 * );
 */
const useCountdown = (
  targetDate: Date | string | number,
  onComplete?: () => void
): TimeLeft & { isComplete: boolean } => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0 && !isComplete) {
        setIsComplete(true);
        onComplete?.();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete, isComplete]);

  return { ...timeLeft, isComplete };
};

export default useCountdown;
