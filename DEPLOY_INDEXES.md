# Como Deployar Índices do Firestore

O Firebase está solicitando a criação de índices compostos para otimizar as queries. Você tem duas opções:

## Opção 1: Criar Manualmente (Mais Rápido)

1. Acesse o link fornecido no erro do console do navegador
2. Ou vá para: [Firebase Console](https://console.firebase.google.com/)
3. Selecione seu projeto
4. Vá em **Firestore Database** > **Índices**
5. Clique em **Criar Índice**
6. Configure:
   - **Coleção**: `payments`
   - **Campos**:
     - `numero_contrato` (Ascendente)
     - `createdAt` (Descendente)
   - **Query scope**: Collection
7. Clique em **Criar**

## Opção 2: Deploy via Firebase CLI

Se você tem o Firebase CLI instalado:

```bash
# Instalar Firebase CLI (se ainda não tiver)
npm install -g firebase-tools

# Fazer login
firebase login

# Deploy dos índices
firebase deploy --only firestore:indexes
```

## Índices Necessários

O arquivo `firestore.indexes.json` já contém todos os índices necessários:

1. **payments** - `numero_contrato` (ASC) + `createdAt` (DESC)
2. **contracts** - `createdAt` (DESC)
3. **contract_amendments** - `contract_id` (ASC) + `amendment_date` (DESC)
4. **contract_periods** - `contract_id` (ASC) + `period_number` (ASC)

## Nota Importante

Após criar os índices, pode levar alguns minutos para eles ficarem ativos. O Firebase enviará um email quando estiverem prontos.
