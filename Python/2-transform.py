import pandas as pd
import streamlit as st
from google.cloud import storage
import datetime
import warnings
import time
warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")

# Tratar dados do arquivo excel e criar o arquivo csv

# 1- EMPENHOS
# Carregamento do arquivo excel
df_empenhos = pd.read_excel(r"Python\Extrato_de_Empenho.xlsx")

# remover da linha 0 a linha 7
df_empenhos = df_empenhos.iloc[7:]

# usar primeira linha como cabeçalho
df_empenhos.columns = df_empenhos.iloc[0]

# remover as duas primeiras linhas
df_empenhos = df_empenhos.iloc[2:]

# converter as datas da coluna 'DATA NE' que estpa no formato dd/mm/yyyy para datetime e formato YYYY-MM-DD
df_empenhos['DATA NE'] = pd.to_datetime(df_empenhos['DATA NE'], format='%d/%m/%Y').dt.strftime('%Y-%m-%d')

# converter as colunas "Empenhado;Reforco;Anulacao;Saldo Empenho;Liquidado no Exercicio;Empenhos a Liquidar;Pagamentos do Exercicio;Liquidados a Pagar;Total a Pagar;Em Liquidacao" para float
colunas_para_converter = ["Empenhado", "Reforco", "Anulacao", "Saldo Empenho", "Liquidado no Exercicio", "Empenhos a Liquidar", "Pagamentos do Exercicio", "Liquidados a Pagar", "Total a Pagar", "Em Liquidacao"]
for coluna in colunas_para_converter:
    df_empenhos[coluna] = df_empenhos[coluna].astype(float)

# criar o arquivo csv
df_empenhos.to_csv(r"Python\relatorio_empenhos.csv", index=False)
time.sleep(10)


# 2 - PAGAMENTOS
# Carregamento do arquivo excel
df_pagamentos = pd.read_excel(r"Python\pagamentos_do_exercicio.xlsx")

# remover da linha 0 a linha 7
df_pagamentos = df_pagamentos.iloc[7:]

# usar primeira linha como cabeçalho
df_pagamentos.columns = df_pagamentos.iloc[0]

# remover a primeira linha
df_pagamentos = df_pagamentos.iloc[1:]

# converter as datas da coluna 'DATA' que estpa no formato dd/mm/yyyy para datetime e formato YYYY-MM-DD
df_pagamentos['DATA'] = pd.to_datetime(df_pagamentos['DATA'], format='%d/%m/%Y').dt.strftime('%Y-%m-%d')

# converter a coluna MOVIMENTOpara float
colunas_para_converter = ["MOVIMENTO"]
for coluna in colunas_para_converter:
    df_pagamentos[coluna] = df_pagamentos[coluna].astype(float)

# criar o arquivo csv
df_pagamentos.to_csv(r"Python\relatorio_pagamentos.csv", index=False)
time.sleep(10)

#  Adicione logs para verificar se os arquivos foram criados
print("Arquivo relatorio_empenhos.csv criado com sucesso!")
print("Arquivo relatorio_pagamentos.csv criado com sucesso!")

# st.dataframe(df_pagamentos)