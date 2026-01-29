from pydrive.auth import GoogleAuth
from pydrive.drive import GoogleDrive
import os

# Configuração da autenticação usando seu arquivo credenciamentosjson.json
gauth = GoogleAuth()
gauth.LoadCredentialsFile("credenciamentosjson.json")

if gauth.credentials is None:
    # Se não houver credenciais salvas, abre navegador para login
    gauth.LocalWebserverAuth()
elif gauth.access_token_expired:
    # Atualiza token se expirado
    gauth.Refresh()
else:
    gauth.Authorize()

# Salva credenciais para reutilizar
gauth.SaveCredentialsFile("credenciamentosjson.json")

drive = GoogleDrive(gauth)

# Nome da pasta no Drive
folder_name = "app_contratos"

# Localiza a pasta pelo nome
def get_folder_id(name):
    query = f"title='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    folders = drive.ListFile({'q': query}).GetList()
    if folders:
        return folders[0]['id']
    else:
        print(f"Pasta '{name}' não encontrada.")
        return None

folder_id = get_folder_id(folder_name)

# Arquivos locais para upload
arquivos = [
    "Python/relatorio_empenhos.csv",
    "Python/relatorio_pagamentos.csv"
]

# Upload para a pasta
for arquivo in arquivos:
    nome = os.path.basename(arquivo)
    f = drive.CreateFile({'title': nome, 'parents': [{'id': folder_id}]})
    f.SetContentFile(arquivo)
    f.Upload()
    print(f"{nome} enviado para a pasta {folder_name} no Google Drive.")