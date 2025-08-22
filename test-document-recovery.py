#!/usr/bin/env python3

import requests
import urllib3
import sys

# Deshabilitar warnings SSL para testing
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_document_recovery(document_id, description=""):
    print(f"\n{'='*60}")
    print(f"TESTING DOCUMENT RECOVERY: {description}")
    print(f"Document ID: {document_id}")
    print(f"{'='*60}")
    
    url = f"https://localhost/dashboard-monitor/api/documents/{document_id}/view"
    
    try:
        # Hacer request sin autenticación primero para ver el comportamiento
        response = requests.get(url, verify=False, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'N/A')}")
        print(f"Content-Length: {response.headers.get('Content-Length', 'N/A')}")
        
        # Mostrar headers especiales de recuperación
        recovery_headers = {
            'X-Document-Recovery': response.headers.get('X-Document-Recovery'),
            'X-Document-Status': response.headers.get('X-Document-Status'),
            'X-Recovery-Type': response.headers.get('X-Recovery-Type'),
            'X-Original-Document-Id': response.headers.get('X-Original-Document-Id'),
            'X-Recovered-Document-Id': response.headers.get('X-Recovered-Document-Id'),
            'X-Recovery-Warning': response.headers.get('X-Recovery-Warning')
        }
        
        print("\nRecovery Headers:")
        for header, value in recovery_headers.items():
            if value:
                print(f"  {header}: {value}")
        
        # Analizar el tipo de respuesta
        content_type = response.headers.get('Content-Type', '').lower()
        
        if 'application/pdf' in content_type:
            print("\n✅ PDF Response received")
            if recovery_headers.get('X-Document-Status') == 'PLACEHOLDER':
                print("🔴 PLACEHOLDER PDF - Document not found, showing informational PDF")
            elif recovery_headers.get('X-Document-Recovery') == 'SIMILARITY_MATCH':
                print("🟡 RECOVERED PDF - Document recovered by similarity matching")
            else:
                print("🟢 NORMAL PDF - Document found normally")
                
        elif 'application/json' in content_type:
            print("\n❌ JSON Error Response:")
            try:
                error_data = response.json()
                print(f"  Error: {error_data.get('error', 'N/A')}")
                print(f"  Message: {error_data.get('message', 'N/A')}")
            except:
                print("  Could not parse JSON response")
        else:
            print(f"\n❓ Unexpected Content-Type: {content_type}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

def main():
    print("🧪 DOCUMENT RECOVERY SYSTEM TEST")
    print("Testing enhanced document recovery mechanism")
    
    # Test 1: Documento que sabemos que está huérfano
    test_document_recovery(
        "cd4a1392-f52f-4cf2-9a60-b124d84e2c9a", 
        "Known orphaned document (DNI 34642267)"
    )
    
    # Test 2: Un documento que debería existir
    test_document_recovery(
        "022759d9-d709-4e37-8f26-388d40619919",
        "Document that should exist (DNI 34642267)"
    )
    
    # Test 3: Documento completamente inexistente
    test_document_recovery(
        "00000000-0000-0000-0000-000000000000",
        "Non-existent document ID"
    )

if __name__ == "__main__":
    main()
