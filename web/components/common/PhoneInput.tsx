'use client';

import React from 'react';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = '10-digit number',
  className = '',
  label,
  error,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(val);
  };

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {label && (
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <div className={`flex items-center bg-gray-50 border-2 rounded-2xl overflow-hidden transition-all group ${
        error ? 'border-rose-200' : 'border-transparent focus-within:border-emerald-500 focus-within:bg-white'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className="pl-5 pr-3 flex items-center gap-2 border-r border-gray-100 py-3 shrink-0">
          <Phone className={`w-4 h-4 ${error ? 'text-rose-400' : 'text-emerald-500'}`} />
          <span className="text-sm font-black text-gray-900 tracking-tight">+91</span>
        </div>
        <input
          type="tel"
          maxLength={10}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className="w-full h-14 pr-5 text-sm font-semibold outline-none bg-transparent"
        />
      </div>
      {error && <p className="text-[10px] font-bold text-rose-500 ml-1">{error}</p>}
    </div>
  );
};
