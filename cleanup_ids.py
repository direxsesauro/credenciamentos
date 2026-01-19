import firebase_admin
from firebase_admin import credentials, firestore

"""
Script para limpar campos 'id' internos dos documentos do Firestore.
Isso é opcional - o serviço TypeScript já foi atualizado para lidar com ambos os casos.

Execute este script se quiser padronizar os documentos e remover o campo 'id' interno.
"""

cred = credentials.Certificate("credenciamentosjson.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def cleanup_internal_ids():
    """Remove o campo 'id' interno de todos os documentos da coleção contracts"""
    contracts_ref = db.collection("contracts")
    docs = contracts_ref.stream()
    
    count = 0
    for doc in docs:
        data = doc.to_dict()
        
        # Se o documento tem um campo 'id' interno, removê-lo
        if 'id' in data:
            # Criar uma cópia dos dados sem o campo 'id'
            clean_data = {k: v for k, v in data.items() if k != 'id'}
            
            # Atualizar o documento
            doc.reference.set(clean_data)
            count += 1
            print(f"Limpado documento {doc.id} (tinha id interno: {data['id']})")
    
    print(f"\nLimpeza concluída! {count} documentos atualizados.")

if __name__ == "__main__":
    print("ATENÇÃO: Este script irá remover o campo 'id' interno de todos os documentos.")
    print("O serviço TypeScript já foi atualizado para funcionar com ou sem este campo.")
    print("Esta limpeza é OPCIONAL.\n")
    
    resposta = input("Deseja continuar? (s/n): ")
    
    if resposta.lower() == 's':
        cleanup_internal_ids()
    else:
        print("Operação cancelada.")
