import pandas as pd
import streamlit as st
from google.cloud import storage
import datetime
import warnings
import time
warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")


# 1 - tratamento do arquivo excel
df = pd.read_excel("Extrato_de_Empenho.xlsx")

# remover da linha 0 a linha 7
df = df.iloc[7:]

# usar primeira linha como cabeçalho
df.columns = df.iloc[0]

# remover as duas primeiras linhas
df = df.iloc[2:]

# converter as datas da coluna 'DATA NE' que estpa no formato dd/mm/yyyy para datetime e formato YYYY-MM-DD
df['DATA NE'] = pd.to_datetime(df['DATA NE'], format='%d/%m/%Y').dt.strftime('%Y-%m-%d')

# converter as colunas "Empenhado;Reforco;Anulacao;Saldo Empenho;Liquidado no Exercicio;Empenhos a Liquidar;Pagamentos do Exercicio;Liquidados a Pagar;Total a Pagar;Em Liquidacao" para float
colunas_para_converter = ["Empenhado", "Reforco", "Anulacao", "Saldo Empenho", "Liquidado no Exercicio", "Empenhos a Liquidar", "Pagamentos do Exercicio", "Liquidados a Pagar", "Total a Pagar", "Em Liquidacao"]
for coluna in colunas_para_converter:
    df[coluna] = df[coluna].astype(float)

# 3 - criar o arquivo csv
df.to_csv("relatorio_empenhos.csv", index=False)
time.sleep(10)

# 2 - upload do arquivo csv para o cloud storage
def upload_csv():
    client = storage.Client()
    bucket = client.bucket("csv-empenhos")
    filename = f"relatorio_empenhos.csv"
    blob = bucket.blob(filename)
    blob.upload_from_filename(filename)
    print(f"{filename} enviado para Cloud Storage!")

upload_csv()

# st.dataframe(df)