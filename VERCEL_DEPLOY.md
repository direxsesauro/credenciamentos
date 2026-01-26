# Configuração de Variáveis de Ambiente no Vercel

Este guia explica como configurar as variáveis de ambiente necessárias para o funcionamento da aplicação em produção no Vercel.

## 🔧 Variáveis de Ambiente Necessárias

### Firebase
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Google Drive (para Empenhos)
- `VITE_GOOGLE_DRIVE_API_KEY`
- `VITE_GOOGLE_DRIVE_FILE_ID`

## 📝 Como Configurar no Vercel

### Passo 1: Acessar as Configurações do Projeto

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto (`sesau-credenciamentos` ou similar)
3. Clique em **Settings** (Configurações)
4. No menu lateral, clique em **Environment Variables** (Variáveis de Ambiente)

### Passo 2: Adicionar Variáveis de Ambiente

Para cada variável:

1. Clique em **Add New** (Adicionar Nova)
2. No campo **Key**, digite o nome da variável (ex: `VITE_GOOGLE_DRIVE_API_KEY`)
3. No campo **Value**, cole o valor da variável
4. Selecione os ambientes onde a variável será usada:
   - ✅ **Production** (Produção)
   - ✅ **Preview** (Preview - opcional, mas recomendado)
   - ✅ **Development** (Desenvolvimento - opcional)
5. Clique em **Save**

### Passo 3: Verificar Variáveis Configuradas

Após adicionar todas as variáveis, você deve ver uma lista como esta:

```
VITE_FIREBASE_API_KEY                    [Production, Preview]
VITE_FIREBASE_AUTH_DOMAIN                [Production, Preview]
VITE_FIREBASE_PROJECT_ID                  [Production, Preview]
VITE_FIREBASE_STORAGE_BUCKET              [Production, Preview]
VITE_FIREBASE_MESSAGING_SENDER_ID         [Production, Preview]
VITE_FIREBASE_APP_ID                      [Production, Preview]
VITE_GOOGLE_DRIVE_API_KEY                 [Production, Preview]
VITE_GOOGLE_DRIVE_FILE_ID                 [Production, Preview]
```

### Passo 4: Fazer Novo Deploy

⚠️ **IMPORTANTE**: Após adicionar ou modificar variáveis de ambiente, você **DEVE** fazer um novo deploy:

1. Vá para a aba **Deployments**
2. Clique nos três pontos (...) do último deployment
3. Selecione **Redeploy**
4. Ou faça um novo commit e push para o repositório

**Nota**: As variáveis de ambiente são injetadas no momento do build. Se você apenas adicionar as variáveis sem fazer um novo deploy, elas não estarão disponíveis.

## 🔍 Verificando se as Variáveis Estão Configuradas

### No Console do Navegador (Produção)

1. Abra a aplicação em produção: `https://credenciamentos.vercel.app`
2. Abra o Console do Desenvolvedor (F12)
3. Vá para a aba **Console**
4. Procure por mensagens de erro relacionadas a:
   - "Variáveis de ambiente não configuradas"
   - "Google Drive API Key ou File ID não configurados"
   - Erros 403 ou 404 ao buscar o CSV

### Teste Rápido

Se as variáveis estiverem configuradas corretamente, você deve ver no console:
```
CSV carregado com sucesso do Google Drive. Tamanho: XXXX caracteres
Colunas encontradas no CSV: [...]
Total de empenhos processados: XX
```

## 🐛 Troubleshooting

### Problema: "Variáveis de ambiente não configuradas no Vercel"

**Solução**: 
1. Verifique se todas as variáveis foram adicionadas no Vercel
2. Certifique-se de que selecionou **Production** no ambiente
3. Faça um novo deploy após adicionar as variáveis

### Problema: "Acesso negado ao arquivo" (Erro 403)

**Solução**:
1. Verifique se a API Key do Google Drive tem a URL de produção nas restrições:
   - Acesse [Google Cloud Console](https://console.cloud.google.com/)
   - Vá em **APIs e Serviços** > **Credenciais**
   - Edite a chave de API "buscarcsv"
   - Em **Restrições de sites**, adicione: `https://credenciamentos.vercel.app`
   - Salve as alterações

2. Verifique se o arquivo CSV está compartilhado publicamente:
   - Abra o arquivo no Google Drive
   - Clique com botão direito > **Compartilhar**
   - Configure para **"Qualquer pessoa com o link pode visualizar"**

### Problema: "Arquivo CSV não encontrado" (Erro 404)

**Solução**:
1. Verifique se o `VITE_GOOGLE_DRIVE_FILE_ID` está correto
2. Certifique-se de que está usando o ID do **arquivo CSV**, não da pasta
3. Teste o ID acessando: `https://drive.google.com/file/d/[FILE_ID]/view`

### Problema: Dados não aparecem mesmo com variáveis configuradas

**Solução**:
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Faça um hard refresh (Ctrl+Shift+R)
3. Verifique o console do navegador para erros específicos
4. Verifique se o arquivo CSV tem os empenhos correspondentes aos números cadastrados no contrato

## 📚 Recursos Adicionais

- [Documentação do Vercel sobre Variáveis de Ambiente](https://vercel.com/docs/concepts/projects/environment-variables)
- [Documentação do Google Drive API](https://developers.google.com/drive/api/guides/about-sdk)
