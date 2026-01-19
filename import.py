import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

cred = credentials.Certificate("credenciamentosjson.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

df = pd.read_csv("database_credenciamentos_sesau.csv", sep=";", encoding="latin1")

for _, row in df.iterrows():
    docData = {
        "cnpj": row["cnpj"],
        "empresa": row["empresa"],
        "numero_contrato": row["numero_contrato"],
        "id_contrato": row["id_contrato"],
        "numero_processo": row["numero_processo"],
        "natureza": row["natureza"],
        "objeto": row["objeto"],
        "valor_global_anul": row["valor_global_anul"],
        "inicio_vigencia": row["inicio_vigencia"],
        "createdAt": datetime.now(),
        "updatedAt": datetime.now()
        # Removido o campo 'id' - o Firestore gera automaticamente
    }
    db.collection("contracts").add(docData)

print("Importação concluída!")