import React from 'react';
import { X } from 'lucide-react';

interface CurrencyInputProps {
  value: number;
  onChange: (newValue: number) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showClear?: boolean;
  allowZeroDisplay?: boolean;
  prefixClassName?: string;
}

/**
 * Campo de Moeda Brasileira (R$) com máscara automática de centavos (,00) e separador de milhar (.)
 * Conforme o usuário digita os números, os centavos e pontos de milhar são formatados em tempo real
 * (ex: digitar 35000000 exibe automaticamente "350.000,00").
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0,00',
  className = '',
  inputClassName = '',
  showClear = true,
  allowZeroDisplay = false,
  prefixClassName = 'text-slate-400',
}) => {
  const formatDisplay = (val: number): string => {
    if (!val && !allowZeroDisplay) return '';
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      onChange(0);
      return;
    }
    // Limita a 13 dígitos (até R$ 99.999.999.999,99)
    const capped = rawDigits.slice(0, 13);
    const numericValue = parseInt(capped, 10) / 100;
    onChange(numericValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Atalho: se apertar 'k' ou 'K', multiplica o valor atual por 1.000 (ex: R$ 3,50 ou 350 -> R$ 350.000,00)
    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      if (value > 0 && value < 100000) {
        onChange(value * 1000);
      }
    }
  };

  const displayValue = formatDisplay(value);

  return (
    <div className={`relative flex items-center ${className}`}>
      <span
        className={`absolute left-2.5 text-[11px] font-extrabold pointer-events-none select-none ${prefixClassName}`}
      >
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full pl-8 ${
          showClear && value > 0 ? 'pr-7' : 'pr-2'
        } py-2 rounded-lg text-xs font-extrabold focus:outline-none ${inputClassName}`}
      />
      {showClear && value > 0 && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="absolute right-2 p-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          title="Zerar valor"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
