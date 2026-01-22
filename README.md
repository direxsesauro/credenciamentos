# SESAU/RO - Sistema de Gestão SUS com Firebase

Sistema de controle de pagamentos de prestadores credenciados da SESAU/RO, agora integrado com Firebase Firestore para persistência de dados em tempo real.

## 🚀 Configuração do Firebase

### 1. Criar Projeto no Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Siga o assistente de criação do projeto
4. Após criar, vá para "Configurações do projeto" (ícone de engrenagem)

### 2. Configurar Firestore Database

1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha **"Modo de produção"**
4. Selecione a localização (recomendado: `southamerica-east1` - São Paulo)

### 3. Configurar Regras de Segurança

1. No Firestore Database, vá para a aba "Regras"
2. Copie o conteúdo do arquivo `firestore.rules` deste projeto
3. Cole no editor de regras do Firebase Console
4. Clique em "Publicar"

> ⚠️ **Atenção**: As regras atuais permitem acesso público. Para produção, considere implementar validações adicionais.

### 4. Configurar Índices Compostos

**IMPORTANTE:** O sistema requer índices compostos para funcionar corretamente.

1. No Firestore Database, vá para a aba "Índices"
2. Clique em "Criar Índice" e configure:
   - **Coleção**: `payments`
   - **Campos**: `numero_contrato` (Ascendente) + `createdAt` (Descendente)
   - **Query scope**: Collection
3. Repita para outras coleções conforme necessário
4. Alternativamente, use o Firebase CLI: `firebase deploy --only firestore:indexes`
5. Veja `DEPLOY_INDEXES.md` para instruções detalhadas

**Nota:** O sistema funcionará sem os índices (ordenando em memória), mas será mais lento. Crie os índices para melhor performance.

### 5. Obter Credenciais do Projeto

1. Vá para "Configurações do projeto" > "Geral"
2. Role até "Seus aplicativos" e clique no ícone da Web `</>`
3. Registre seu aplicativo (nome: "SESAU Web App")
4. Copie as credenciais do `firebaseConfig`

### 6. Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env.local`:
   ```bash
   copy .env.example .env.local
   ```

2. Edite `.env.local` e preencha com suas credenciais:
   ```env
   VITE_FIREBASE_API_KEY=sua-api-key-aqui
   VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=seu-projeto-id
   VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
   VITE_FIREBASE_APP_ID=seu-app-id
   ```

## 📦 Instalação e Execução

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 🔄 Migração de Dados

A aplicação possui um sistema de migração automática que transfere dados do `localStorage` para o Firestore na primeira execução.

**O que é migrado:**
- Todos os contratos salvos localmente
- Todos os pagamentos salvos localmente

**Como funciona:**
1. Na primeira carga da aplicação, a migração é executada automaticamente
2. Uma flag é salva no `localStorage` para evitar migrações duplicadas
3. Os dados originais permanecem no `localStorage` como backup

**Para resetar a migração (apenas para testes):**
```javascript
// No console do navegador
localStorage.removeItem('sesau_migrated_to_firestore');
```

## 🏗️ Arquitetura

### Estrutura de Pastas

```
sesau-credenciamentos/
├── services/
│   └── firebase/
│       ├── contracts.service.ts    # Operações CRUD de contratos
│       └── payments.service.ts     # Operações CRUD de pagamentos
├── hooks/
│   ├── useContracts.ts            # Hook para contratos
│   └── usePayments.ts             # Hook para pagamentos
├── utils/
│   └── migration.ts               # Utilitário de migração
├── components/                     # Componentes React
├── firebase.config.ts             # Configuração Firebase
├── firestore.rules                # Regras de segurança
└── firestore.indexes.json         # Índices compostos
```

### Serviços Firebase

**contracts.service.ts**
- `getContracts()` - Buscar todos os contratos
- `getContractById(id)` - Buscar contrato específico
- `addContract(contract)` - Adicionar novo contrato
- `updateContract(id, contract)` - Atualizar contrato
- `deleteContract(id)` - Deletar contrato
- `subscribeToContracts(callback)` - Listener em tempo real

**payments.service.ts**
- `getPayments()` - Buscar todos os pagamentos
- `getPaymentById(id)` - Buscar pagamento específico
- `addPayment(payment)` - Adicionar novo pagamento
- `getPaymentsByContract(contractNumber)` - Buscar por contrato
- `subscribeToPayments(callback)` - Listener em tempo real

### Hooks Customizados

**useContracts(realtime)**
- Gerencia estado de contratos
- Sincronização em tempo real (opcional)
- Operações CRUD encapsuladas
- Estados de loading e error

**usePayments(realtime, contractNumber)**
- Gerencia estado de pagamentos
- Filtro opcional por contrato
- Sincronização em tempo real (opcional)
- Estados de loading e error

## 🔒 Segurança

As regras atuais do Firestore permitem acesso público para leitura e escrita. Isso é adequado para um ambiente interno, mas considere:

- Implementar autenticação para ambientes públicos
- Adicionar validações de dados mais rigorosas
- Implementar rate limiting
- Monitorar uso através do Firebase Console

## 📊 Monitoramento

Acesse o Firebase Console para:
- Visualizar dados em tempo real
- Monitorar uso e custos
- Ver logs de erros
- Analisar performance

## 🐛 Troubleshooting

### Erro: "Firebase: Error (auth/api-key-not-valid)"
- Verifique se as credenciais no `.env.local` estão corretas
- Certifique-se de que o arquivo `.env.local` está na raiz do projeto

### Dados não aparecem
- Verifique se as regras de segurança foram publicadas
- Abra o console do navegador para ver erros
- Verifique sua conexão com a internet

### Migração não funciona
- Verifique se há dados no `localStorage` (F12 > Application > Local Storage)
- Veja os logs no console do navegador
- Tente resetar a flag de migração

## 📝 Notas Importantes

- **Tempo Real**: A aplicação usa listeners em tempo real. Múltiplas abas abertas verão as mesmas atualizações instantaneamente.
- **Offline**: O Firestore tem cache offline automático, mas operações de escrita requerem conexão.
- **Custos**: Monitore o uso no Firebase Console. O plano gratuito é generoso, mas pode ser necessário upgrade para produção.

## 🤝 Contribuindo

Para adicionar novas funcionalidades:
1. Crie novos serviços em `services/firebase/`
2. Crie hooks customizados em `hooks/`
3. Atualize as regras de segurança conforme necessário
4. Documente as mudanças

## 📄 Licença

Este projeto é de uso interno da SESAU/RO.
