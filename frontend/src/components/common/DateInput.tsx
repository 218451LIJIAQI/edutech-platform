import { useState, useRef, forwardRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useOnClickOutside } from '@/hooks';

interface DateInputProps {
  /** Current value */
  value?: Date | null;
  /** Callback when value changes */
  onChange?: (date: Date | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum date */
  minDate?: Date;
  /** Maximum date */
  maxDate?: Date;
  /** Date format for display */
  displayFormat?: (date: Date) => string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Error state */
  error?: boolean;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const defaultFormat = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * DateInput Component
 * Date picker with calendar dropdown
 * 
 * @example
 * <DateInput
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   minDate={new Date()}
 *   placeholder="Select date"
 * />
 */
const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value,
      onChange,
      placeholder = 'Select date',
      minDate,
      maxDate,
      displayFormat = defaultFormat,
      size = 'md',
      error = false,
      disabled = false,
      className,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => value || new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(containerRef, () => setIsOpen(false), isOpen);

    const sizeClasses = {
      sm: 'py-2 px-3 text-sm',
      md: 'py-3 px-4 text-base',
      lg: 'py-4 px-5 text-lg',
    };

    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();

      const days: { date: Date; isCurrentMonth: boolean }[] = [];

      // Previous month days
      for (let i = firstDay - 1; i >= 0; i--) {
        days.push({
          date: new Date(year, month - 1, daysInPrevMonth - i),
          isCurrentMonth: false,
        });
      }

      // Current month days
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({
          date: new Date(year, month, i),
          isCurrentMonth: true,
        });
      }

      // Next month days
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
        });
      }

      return days;
    };

    const isDateDisabled = (date: Date) => {
      if (minDate && date < new Date(minDate.setHours(0, 0, 0, 0))) return true;
      if (maxDate && date > new Date(maxDate.setHours(23, 59, 59, 999))) return true;
      return false;
    };

    const isDateSelected = (date: Date) => {
      if (!value) return false;
      return (
        date.getDate() === value.getDate() &&
        date.getMonth() === value.getMonth() &&
        date.getFullYear() === value.getFullYear()
      );
    };

    const isToday = (date: Date) => {
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    };

    const handleSelect = (date: Date) => {
      if (isDateDisabled(date)) return;
      onChange?.(date);
      setIsOpen(false);
    };

    const goToPrevMonth = () => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const days = getDaysInMonth(viewDate);

    return (
      <div ref={containerRef} className={clsx('relative', className)}>
        {/* Input */}
        <div className="relative">
          <input
            ref={ref}
            type="text"
            readOnly
            value={value ? displayFormat(value) : ''}
            placeholder={placeholder}
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={clsx(
              'w-full rounded-xl border bg-white cursor-pointer',
              'transition-all duration-200 ease-out',
              'placeholder-gray-400 text-gray-900 pr-10',
              'focus:outline-none focus:ring-4',
              sizeClasses[size],
              !error && 'border-gray-200 hover:border-gray-300 focus:ring-primary-500/10 focus:border-primary-500',
              error && 'border-danger-400 focus:ring-danger-500/10 focus:border-danger-500',
              disabled && 'opacity-50 cursor-not-allowed bg-gray-100'
            )}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>

        {/* Calendar Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-xl animate-fadeIn w-[300px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPrevMonth}
                aria-label="Previous month"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-gray-900">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                onClick={goToNextMonth}
                aria-label="Next month"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="h-8 flex items-center justify-center text-xs font-semibold text-gray-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map(({ date, isCurrentMonth }, index) => {
                const isDisabled = isDateDisabled(date);
                const isSelected = isDateSelected(date);
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={index}
                    onClick={() => handleSelect(date)}
                    disabled={isDisabled}
                    className={clsx(
                      'h-9 w-9 rounded-lg text-sm font-medium transition-all duration-150',
                      'flex items-center justify-center',
                      !isCurrentMonth && 'text-gray-300',
                      isCurrentMonth && !isSelected && !isDisabled && 'text-gray-700 hover:bg-gray-100',
                      isTodayDate && !isSelected && 'ring-2 ring-primary-500/30',
                      isSelected && 'bg-primary-600 text-white shadow-lg shadow-primary-500/25',
                      isDisabled && 'opacity-30 cursor-not-allowed'
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Today button */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  const today = new Date();
                  setViewDate(today);
                  handleSelect(today);
                }}
                className="w-full py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';

export default DateInput;
