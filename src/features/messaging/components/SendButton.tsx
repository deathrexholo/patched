import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import '../styles/SendButton.css';

interface SendButtonProps {
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

export default function SendButton({
  disabled = false,
  loading = false,
  error = false,
  onClick,
  type = 'submit',
  className = ''
}: SendButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick && !disabled && !loading) {
      onClick();
    }
  };

  return (
    <button
      type={type}
      className={`send-button ${className} ${disabled ? 'disabled' : ''} ${loading ? 'loading' : ''} ${error ? 'error' : ''}`}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={loading ? 'Sending message...' : 'Send message'}
    >
      {loading ? (
        <Loader2 size={20} className="spinner" />
      ) : (
        <Send size={20} />
      )}
    </button>
  );
}