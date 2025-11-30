import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

interface CountdownTimerProps {
  /** Target date/time to count down to */
  targetDate: Date | string | number;
  /** Callback when countdown reaches zero */
  onComplete?: () => void;
  /** Whether to show days */
  showDays?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Style variant */
  variant?: 'default' | 'minimal' | 'card';
  /** Labels for time units */
  labels?: {
    days?: string;
    hours?: string;
    minutes?: string;
    seconds?: string;
  };
  /** Custom className */
  className?: string;
  /** Content to show when countdown is complete */
  completedContent?: React.ReactNode;
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
 * CountdownTimer Component
 * Displays a countdown to a target date/time
 * 
 * @example
 * <CountdownTimer 
 *   targetDate={new Date('2024-12-31')}
 *   onComplete={() => console.log('Happy New Year!')}
 * />
 * 
 * @example
 * <CountdownTimer 
 *   targetDate={saleEndDate}
 *   variant="card"
 *   completedContent={<p>Sale has ended!</p>}
 * />
 */
const CountdownTimer = ({
  targetDate,
  onComplete,
  showDays = true,
  size = 'md',
  variant = 'default',
  labels = {},
  className,
  completedContent,
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));
  const [isComplete, setIsComplete] = useState(false);

  const defaultLabels = {
    days: labels.days ?? 'Days',
    hours: labels.hours ?? 'Hours',
    minutes: labels.minutes ?? 'Min',
    seconds: labels.seconds ?? 'Sec',
  };

  const updateTimer = useCallback(() => {
    const newTimeLeft = calculateTimeLeft(targetDate);
    setTimeLeft(newTimeLeft);

    if (newTimeLeft.total <= 0 && !isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [targetDate, onComplete, isComplete]);

  useEffect(() => {
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [updateTimer]);

  if (isComplete && completedContent) {
    return <>{completedContent}</>;
  }

  const sizeClasses = {
    sm: { number: 'text-lg', label: 'text-xs' },
    md: { number: 'text-2xl', label: 'text-sm' },
    lg: { number: 'text-4xl', label: 'text-base' },
  };

  const TimeUnit = ({ value, label }: { value: number; label: string }) => {
    const formattedValue = String(value).padStart(2, '0');

    if (variant === 'minimal') {
      return (
        <span className={clsx(sizeClasses[size].number, 'font-mono font-bold')}>
          {formattedValue}
        </span>
      );
    }

    if (variant === 'card') {
      return (
        <div className="flex flex-col items-center bg-white rounded-xl shadow-md p-3 min-w-[60px]">
          <span className={clsx(sizeClasses[size].number, 'font-bold text-gray-900')}>
            {formattedValue}
          </span>
          <span className={clsx(sizeClasses[size].label, 'text-gray-500 uppercase tracking-wide')}>
            {label}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center">
        <span className={clsx(sizeClasses[size].number, 'font-bold text-gray-900 font-mono')}>
          {formattedValue}
        </span>
        <span className={clsx(sizeClasses[size].label, 'text-gray-500')}>
          {label}
        </span>
      </div>
    );
  };

  const Separator = () => (
    <span className={clsx(
      sizeClasses[size].number,
      'font-bold text-gray-400 mx-1',
      variant === 'card' && 'self-start mt-3'
    )}>
      :
    </span>
  );

  return (
    <div className={clsx(
      'flex items-center',
      variant === 'card' && 'gap-2',
      variant === 'default' && 'gap-3',
      className
    )}>
      {showDays && timeLeft.days > 0 && (
        <>
          <TimeUnit value={timeLeft.days} label={defaultLabels.days} />
          <Separator />
        </>
      )}
      <TimeUnit value={timeLeft.hours} label={defaultLabels.hours} />
      <Separator />
      <TimeUnit value={timeLeft.minutes} label={defaultLabels.minutes} />
      <Separator />
      <TimeUnit value={timeLeft.seconds} label={defaultLabels.seconds} />
    </div>
  );
};

export default CountdownTimer;
