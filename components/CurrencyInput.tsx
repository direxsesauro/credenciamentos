import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
    disabled?: boolean;
}

/**
 * Componente de input para valores monetários BRL
 * Permite colar valores formatados (ex: 1.234.567,89)
 * Converte automaticamente para número (1234567.89) para o Firebase
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
    value,
    onChange,
    placeholder = 'R$ 0,00',
    className = '',
    required = false,
    disabled = false
}) => {
    const [displayValue, setDisplayValue] = useState<string>('');

    // Formatar número para exibição (1234567.89 -> "1.234.567,89")
    const formatToBRL = (num: number): string => {
        if (isNaN(num) || num === 0) return '';

        return num.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Converter string BRL para número (1.234.567,89 -> 1234567.89)
    const parseFromBRL = (str: string): number => {
        if (!str) return 0;

        // Remove tudo exceto números, pontos e vírgulas
        let cleaned = str.replace(/[^\d.,]/g, '');

        // Se tem vírgula, assumir formato BRL (1.234,56)
        if (cleaned.includes(',')) {
            // Remove pontos (separadores de milhar)
            cleaned = cleaned.replace(/\./g, '');
            // Substitui vírgula por ponto (separador decimal)
            cleaned = cleaned.replace(',', '.');
        }
        // Se só tem ponto, pode ser formato US (1234.56) ou milhar sem centavos (1.234)
        else if (cleaned.includes('.')) {
            // Contar quantos pontos tem
            const dotCount = (cleaned.match(/\./g) || []).length;

            // Se tem mais de um ponto, são separadores de milhar
            if (dotCount > 1) {
                cleaned = cleaned.replace(/\./g, '');
            }
            // Se tem um ponto e mais de 2 dígitos depois, é separador de milhar
            else {
                const parts = cleaned.split('.');
                if (parts[1] && parts[1].length > 2) {
                    cleaned = cleaned.replace('.', '');
                }
            }
        }

        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Atualizar display quando value prop mudar
    useEffect(() => {
        setDisplayValue(formatToBRL(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Permitir campo vazio
        if (inputValue === '') {
            setDisplayValue('');
            onChange(0);
            return;
        }

        // Converter para número
        const numericValue = parseFromBRL(inputValue);

        // Atualizar valor no componente pai
        onChange(numericValue);

        // Atualizar display
        setDisplayValue(inputValue);
    };

    const handleBlur = () => {
        // Ao perder o foco, formatar corretamente
        setDisplayValue(formatToBRL(value));
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        // Ao focar, selecionar todo o texto para facilitar substituição
        e.target.select();
    };

    return (
        <input
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            className={className}
            required={required}
            disabled={disabled}
            inputMode="decimal"
        />
    );
};

export default CurrencyInput;
