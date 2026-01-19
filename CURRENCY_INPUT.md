# Máscara Monetária BRL - CurrencyInput

## Funcionalidade Implementada

Foi criado um componente `CurrencyInput` que permite inserir valores monetários em formato BRL (Real Brasileiro) com as seguintes características:

### ✅ Recursos

1. **Formatação Automática BRL**
   - Exibe valores no formato brasileiro: `1.234.567,89`
   - Separador de milhar: ponto (`.`)
   - Separador decimal: vírgula (`,`)

2. **Colar Valores Formatados**
   - Permite colar valores copiados de planilhas ou documentos
   - Exemplos aceitos:
     - `1.234.567,89` (formato BRL)
     - `1234567.89` (formato US/banco de dados)
     - `1.234` (sem centavos)
     - `1234,56` (sem separador de milhar)

3. **Conversão Automática para Firebase**
   - Converte automaticamente para número com ponto decimal
   - `1.234.567,89` → `1234567.89` (armazenado no Firebase)
   - Garante precisão de 2 casas decimais

4. **UX Aprimorada**
   - Ao focar no campo, seleciona todo o texto (facilita substituição)
   - Ao perder o foco, formata automaticamente
   - Placeholder: `R$ 0,00`
   - Teclado numérico em dispositivos móveis (`inputMode="decimal"`)

## Onde Foi Implementado

### 1. ContractForm.tsx
**Campo:** Valor Global Anual (R$)

```typescript
<CurrencyInput
  value={formData.valor_global_anul || 0}
  onChange={(value) => setFormData(prev => ({ ...prev, valor_global_anul: value }))}
  placeholder="R$ 0,00"
  required
  className="..."
/>
```

### 2. PaymentForm.tsx
**Campos:**
- Valor Bruto NF (R$)
- Valor Pago (R$) nas ordens bancárias (Federal e Estadual)

```typescript
// Valor da NF
<CurrencyInput
  value={valorNfe}
  onChange={setValorNfe}
  placeholder="R$ 0,00"
  required
  className="..."
/>

// Valor pago em cada ordem bancária
<CurrencyInput
  value={entry.valor}
  onChange={(value) => source.update(entry.id, 'valor', value)}
  placeholder="R$ 0,00"
  className="..."
/>
```

## Como Usar

### Digitação Normal
1. Clique no campo
2. Digite o valor: `1234567,89`
3. Ao sair do campo, formata automaticamente: `1.234.567,89`

### Colar Valores
1. Copie um valor de uma planilha (ex: `1.234.567,89`)
2. Cole no campo (Ctrl+V)
3. O componente detecta e converte automaticamente

### Exemplos de Conversão

| Entrada (colada/digitada) | Exibição | Valor no Firebase |
|---------------------------|----------|-------------------|
| `1.234.567,89` | `1.234.567,89` | `1234567.89` |
| `1234567.89` | `1.234.567,89` | `1234567.89` |
| `1.234` | `1.234,00` | `1234.00` |
| `1234,56` | `1.234,56` | `1234.56` |
| `1.234.567` | `1.234.567,00` | `1234567.00` |

## Lógica de Conversão

O componente usa a função `parseFromBRL()` que:

1. Remove caracteres não numéricos (exceto `.` e `,`)
2. Detecta o formato:
   - Se tem vírgula → formato BRL (remove pontos, troca vírgula por ponto)
   - Se tem múltiplos pontos → separadores de milhar (remove todos)
   - Se tem um ponto com >2 dígitos depois → separador de milhar
3. Converte para `number` com precisão decimal

## Benefícios

✅ **Reduz erros de digitação**: Formatação visual clara
✅ **Facilita importação de dados**: Colar de planilhas funciona perfeitamente
✅ **Compatível com Firebase**: Converte automaticamente para número
✅ **UX melhorada**: Seleção automática ao focar, formatação ao sair
✅ **Mobile-friendly**: Teclado numérico em dispositivos móveis

## Arquivos Modificados

- ✅ [components/CurrencyInput.tsx](file:///c:/Users/00840207255/Documents/projetos/sesau-credenciamentos/components/CurrencyInput.tsx) - Novo componente
- ✅ [components/ContractForm.tsx](file:///c:/Users/00840207255/Documents/projetos/sesau-credenciamentos/components/ContractForm.tsx) - Integrado
- ✅ [components/PaymentForm.tsx](file:///c:/Users/00840207255/Documents/projetos/sesau-credenciamentos/components/PaymentForm.tsx) - Integrado

## Teste Manual

Para testar:

1. **Criar Contrato**:
   - Vá para "Contratos" → "+ Contrato"
   - No campo "Valor Global Anual", cole: `12.500.000,00`
   - Verifique que aceita e formata corretamente

2. **Criar Pagamento**:
   - Vá para "Pagamentos" → "+ Pagamento"
   - No campo "Valor Bruto NF", cole: `450.000,00`
   - Nos valores de OB, cole valores diferentes
   - Salve e verifique no Firebase que os valores estão corretos (sem pontos, com ponto decimal)

3. **Verificar no Firebase Console**:
   - Abra o Firestore
   - Veja um contrato: `valor_global_anul` deve ser número (ex: `12500000`)
   - Veja um pagamento: `valor_nfe` deve ser número (ex: `450000`)
