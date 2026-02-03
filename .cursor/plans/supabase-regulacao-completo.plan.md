---
name: Supabase Regulação Completo
overview: Plano completo para armazenar dados de regulação no Supabase a partir do CSV gerado por Python/api_sisreg/3-transform.py (basedadosregulacao.csv), incluindo SQL das tabelas, script de insert e integração no front-end para consumir do Supabase em vez do Drive.
todos:
  - id: todo-1770135061915-4rl8pxfty
    content: ""
    status: pending
isProject: false
---

# Plano completo: Regulação no Supabase (tabelas, insert, front-end)

## 1. Visão geral

- **Fonte dos dados**: CSV gerado por [Python/api_sisreg/3-transform.py](Python/api_sisreg/3-transform.py): `**Python/api_sisreg/basedadosregulacao.csv**`. Colunas (conforme o script): `descricao_interna_procedimento`, `data_aprovacao`, `nome_unidade_executante`, `data_solicitacao`, `codigo_solicitacao`, `nome_grupo_procedimento`, `descricao_sigtap_procedimento`, `status_solicitacao`, `codigo_unidade_executante`.
- **Destino**: Supabase (PostgreSQL). O front-end deixa de consumir o CSV do Drive (pesado e lento) e passa a consultar o Supabase; leitura rápida e filtros no servidor.
- **Entregas**: (1) SQL para criar tabela e políticas; (2) script de insert que lê `basedadosregulacao.csv` e insere no Supabase; (3) serviço no front que consome o Supabase; (4) ApprovalsPage usando o novo serviço.

---

## 2. Pré-requisitos

- Conta no [Supabase](https://supabase.com) (plano gratuito).
- Projeto criado no dashboard; anotar **Project URL** e **anon public** key (e, para o script de insert, a **service_role** key, que não deve ir para o front).
- CSV já gerado: rodar `3-transform.py` para produzir `Python/api_sisreg/basedadosregulacao.csv` (a partir de `agendamentos.csv`).

---

## 3. Variáveis de ambiente

**Front-end** (`.env.local` e Vercel):

- `VITE_SUPABASE_URL` — URL do projeto (ex.: `https://xxxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — chave anon/public (segura para o browser)

**Script de insert** (local, não commitar):

- `SUPABASE_URL` — mesma URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY` — chave service_role (apenas no ambiente onde roda o script)

Incluir no `.env.example` apenas as variáveis do front: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

---

## 4. SQL para criar tabela e políticas (Supabase)

Executar no **SQL Editor** do Supabase (Dashboard → SQL Editor). O script abaixo cria a tabela `approval_records` com as **colunas exatas** de [3-transform.py](Python/api_sisreg/3-transform.py) (basedadosregulacao.csv), mais `type` (opcional, para compatibilidade com ApprovalsPage) e `created_at`. Pode salvar no projeto como `supabase/migrations/001_approval_records.sql` para versionamento.

```sql
-- Tabela principal: registros de aprovação (regulação)
-- Colunas = basedadosregulacao.csv (Python/api_sisreg/3-transform.py)
CREATE TABLE IF NOT EXISTS public.approval_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao_interna_procedimento text,
  data_aprovacao text,
  nome_unidade_executante text,
  data_solicitacao text,
  codigo_solicitacao text,
  nome_grupo_procedimento text,
  descricao_sigtap_procedimento text,
  status_solicitacao text,
  codigo_unidade_executante text,
  type text,
  created_at timestamptz DEFAULT now()
);

-- Índices para filtros e agregações usados na ApprovalsPage
CREATE INDEX IF NOT EXISTS idx_approval_records_data_solicitacao
  ON public.approval_records (data_solicitacao);
CREATE INDEX IF NOT EXISTS idx_approval_records_data_aprovacao
  ON public.approval_records (data_aprovacao);
CREATE INDEX IF NOT EXISTS idx_approval_records_nome_unidade
  ON public.approval_records (nome_unidade_executante);
CREATE INDEX IF NOT EXISTS idx_approval_records_descricao_sigtap
  ON public.approval_records (descricao_sigtap_procedimento);

-- RLS: habilitar e permitir leitura para anon (dashboard público)
ALTER TABLE public.approval_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública para approval_records"
  ON public.approval_records
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Service role full access approval_records"
  ON public.approval_records
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

- **type**: opcional; o CSV do 3-transform não tem essa coluna; o insert pode deixar NULL e o front trata como string vazia para compatibilidade com `ApprovalRecord`.

---

## 5. Script de insert (ler `basedadosregulacao.csv` e inserir no Supabase)

Objetivo: ler `**Python/api_sisreg/basedadosregulacao.csv**` (gerado por [3-transform.py](Python/api_sisreg/3-transform.py)), parsear e inserir em lotes na tabela `approval_records`.

### 5.1. Opção A: Script Python (recomendado)

- Dependências: `pip install supabase python-dotenv` (ou usar variáveis de ambiente direto).
- Arquivo sugerido: `scripts/seed_regulacao_supabase.py` (ou na raiz `seed_regulacao_supabase.py`).
- Fluxo:
  1. Ler `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do ambiente (ou `.env` com `python-dotenv`).
  2. Listar arquivos `*.csv` em `csv/` (ou um único arquivo fixo, ex.: `csv/regulacao.csv`).
  3. Para cada CSV: abrir, ler cabeçalho, para cada linha montar um dict; colunas conhecidas → colunas da tabela; colunas extras → objeto em `extra`.
  4. Inserir em lotes (ex.: 500–1000 linhas por vez) via cliente Supabase (`supabase.table('approval_records').insert(rows).execute()`).
  5. Antes do primeiro insert, opcional: `delete from approval_records` ou truncate para recarga total (usar com cuidado).

Estrutura sugerida do script (pseudocódigo):

- `csv_dir = Path("csv")` (ou path absoluto a partir da raiz do projeto).
- `for path in csv_dir.glob("*.csv"):` abrir com `csv.DictReader` ou pandas `read_csv`.
- Colunas conhecidas: `codigo_solicitacao`, `data_solicitacao`, `data_aprovacao`, `nome_unidade_executante`, `descricao_sigtap_procedimento`, `type`, `status_solicitacao`, `codigo_unidade_executante`. Resto → `extra`.
- Montar lista de dicts e chamar `supabase.table('approval_records').insert(batch).execute()` em loop até acabar as linhas.

### 5.2. Opção B: Script Node/TypeScript

- Dependências: `@supabase/supabase-js`, `papaparse` (já no projeto), `dotenv`.
- Arquivo: `scripts/seedRegulacaoSupabase.mjs` (ou `.ts` com ts-node).
- Mesma lógica: ler CSVs de `csv/`, parsear (PapaParse ou leitura linha a linha), mapear colunas → linha da tabela + `extra`, inserir em lotes com `supabase.from('approval_records').insert(batch)`.

Em ambos os casos, o **insert** é sempre na tabela `approval_records` criada pelo SQL acima; a pasta `csv/` na raiz é a fonte dos dados.

### 5.3. Script Python completo (insert a partir de `basedadosregulacao.csv`)

Arquivo sugerido: `Python/api_sisreg/seed_regulacao_supabase.py` (junto ao pipeline) ou `scripts/seed_regulacao_supabase.py`. Dependências: `pip install supabase`.

**Fonte**: `Python/api_sisreg/basedadosregulacao.csv` (gerado por `3-transform.py`). Colunas do CSV = colunas da tabela (sem `id`, `type`, `created_at`); `type` pode ficar NULL.

```python
"""
Popula approval_records no Supabase a partir de Python/api_sisreg/basedadosregulacao.csv.
Uso: definir SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente, depois:
  python Python/api_sisreg/seed_regulacao_supabase.py
  # ou, se o script estiver em scripts/: python scripts/seed_regulacao_supabase.py
"""
import os
import csv
from pathlib import Path

try:
    from supabase import create_client
except ImportError:
    raise SystemExit("Instale: pip install supabase")

# Colunas do basedadosregulacao.csv (3-transform.py) que viram colunas da tabela
CSV_COLUMNS = [
    "descricao_interna_procedimento", "data_aprovacao", "nome_unidade_executante",
    "data_solicitacao", "codigo_solicitacao", "nome_grupo_procedimento",
    "descricao_sigtap_procedimento", "status_solicitacao", "codigo_unidade_executante",
]

def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.")

    # Caminho do CSV (basedadosregulacao.csv gerado por 3-transform.py)
    script_dir = Path(__file__).resolve().parent
    if script_dir.name == "scripts":
        csv_path = script_dir.parent / "Python" / "api_sisreg" / "basedadosregulacao.csv"
    else:
        csv_path = script_dir / "basedadosregulacao.csv"
    if not csv_path.is_file():
        raise SystemExit(f"CSV não encontrado: {csv_path}. Rode 3-transform.py antes.")

    client = create_client(url, key)
    BATCH_SIZE = 1000
    total_inserted = 0

    with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        batch = []
        for row in reader:
            record = {k: (row.get(k) or "").strip() for k in CSV_COLUMNS}
            batch.append(record)
            if len(batch) >= BATCH_SIZE:
                client.table("approval_records").insert(batch).execute()
                total_inserted += len(batch)
                batch = []
                print(f"  Inseridos {total_inserted}...")
        if batch:
            client.table("approval_records").insert(batch).execute()
            total_inserted += len(batch)

    print(f"Total inserido: {total_inserted}")
    print("Concluído.")
    return total_inserted

if __name__ == "__main__":
    main()
```

- **Recarga total**: No SQL Editor: `TRUNCATE public.approval_records;` e depois rodar o script de novo.
- **Encoding**: O 3-transform exporta com `encoding="utf-8"`; o script usa `utf-8`.

---

## 6. Front-end: serviço Supabase e ApprovalsPage

- **Novo serviço** (ex.: `services/supabase/regulacao-approvals.service.ts`):
  - Inicializar cliente Supabase com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
  - Função que substitui `fetchApprovalsFromDrive()`:
    - Para manter compatibilidade com a ApprovalsPage atual (que espera `ApprovalRecord[]` e faz filtros/agregados no client), pode-se: (1) buscar todos os registros com paginação (`.range()`) e concatenar em memória até acabar, ou (2) passar a fazer agregados no backend (RPC/views) e só buscar dados filtrados. Opção (1) é a mais rápida para implementar: buscar em páginas (ex.: 1000 por vez), acumular e retornar um único array (o Supabase free tier aguenta; 200MB de CSV costuma virar bem menos em JSON comprimido).
  - Retornar array no mesmo formato `ApprovalRecord[]` (campos da tabela + chaves de `extra` no mesmo nível, se desejado) para a ApprovalsPage não precisar mudar lógica de gráficos/filtros.
- **ApprovalsPage**:
  - Trocar `fetchApprovalsFromDrive` por `fetchApprovalsFromSupabase` (ou função do novo serviço).
  - Manter `queryKey` diferente (ex.: `['supabase-approvals']`) para não misturar cache com o Drive.
  - Resto da página (filtros, gráficos, duração) permanece igual.
- **Fallback**: Opcionalmente, manter `fetchApprovalsFromDrive` e usar como fallback se `VITE_SUPABASE_URL` não estiver definido, para não quebrar ambientes que ainda não migraram.

---

## 7. Resumo de arquivos


| Ação      | Arquivo                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| Criar     | `supabase/migrations/001_approval_records.sql` (ou colar o SQL no dashboard) — tabela, índices, RLS           |
| Já existe | `Python/api_sisreg/basedadosregulacao.csv` — gerado por `3-transform.py` (fonte do insert)                    |
| Criar     | `Python/api_sisreg/seed_regulacao_supabase.py` — lê `basedadosregulacao.csv`, insere em `approval_records`    |
| Criar     | `services/supabase/regulacao-approvals.service.ts` — cliente Supabase e função que retorna `ApprovalRecord[]` |
| Alterar   | `components/ApprovalsPage.tsx` — usar novo serviço em vez do Drive                                            |
| Alterar   | `.env.example` — adicionar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                                      |


---

## 8. Ordem de execução sugerida

1. Criar projeto no Supabase e anotar URL e chaves.
2. Executar o SQL no SQL Editor (criar tabela, índices, RLS).
3. Garantir que `Python/api_sisreg/basedadosregulacao.csv` existe (rodar `3-transform.py` se necessário).
4. Implementar e rodar o script de insert (`Python/api_sisreg/seed_regulacao_supabase.py`) com `SUPABASE_SERVICE_ROLE_KEY`; conferir no dashboard que os dados aparecem.
5. Adicionar variáveis de ambiente no front e implementar `services/supabase/regulacao-approvals.service.ts`.
6. Alterar ApprovalsPage para consumir o Supabase; testar filtros e gráficos.
7. (Opcional) Desativar ou manter como fallback o fluxo do Drive.

Após isso, a regulação será lida do Supabase (rápido) em vez do CSV do Drive (pesado e lento); a fonte dos dados no banco é o CSV gerado por `3-transform.py` (`basedadosregulacao.csv`).