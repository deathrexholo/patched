import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string | Date;
  compact?: boolean;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  compact = false,
  className = ''
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(targetDate)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  function calculateTimeRemaining(target: string | Date): TimeRemaining {
    const now = new Date().getTime();
    const targetTime = new Date(target).getTime();
    const difference = targetTime - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      isExpired: false
    };
  }

  if (timeRemaining.isExpired) {
    return null;
  }

  if (compact) {
    return (
      <div className={`countdown-timer-compact ${className}`}>
        <Clock size={14} />
        <span>
          {timeRemaining.days > 0 && `${timeRemaining.days}d `}
          {timeRemaining.hours}h {timeRemaining.minutes}m
        </span>
      </div>
    );
  }

  return (
    <div className={`countdown-timer ${className}`}>
      <div className="countdown-label">Starts in:</div>
      <div className="countdown-values">
        {timeRemaining.days > 0 && (
          <div className="countdown-unit">
            <div className="countdown-value">{timeRemaining.days}</div>
            <div className="countdown-unit-label">days</div>
          </div>
        )}
        <div className="countdown-unit">
          <div className="countdown-value">{timeRemaining.hours}</div>
          <div className="countdown-unit-label">hours</div>
        </div>
        <div className="countdown-unit">
          <div className="countdown-value">{timeRemaining.minutes}</div>
          <div className="countdown-unit-label">min</div>
        </div>
        <div className="countdown-unit">
          <div className="countdown-value">{timeRemaining.seconds}</div>
          <div className="countdown-unit-label">sec</div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
