import React, { useState } from 'react';
import { View, Button, Text, Alert, StyleSheet, Platform } from 'react-native'; // <-- 1. Importar Platform
import * as DocumentPicker from 'expo-document-picker';

export default function UploadTraducao({ servicoId }: { servicoId: string }) {
  const [documento, setDocumento] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const selecionarDocumento = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', 
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setDocumento(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu uma falha ao abrir o seletor de arquivos.');
    }
  };

  const enviarParaAPI = async () => {
    if (!documento) return;

    const formData = new FormData();
    
    // 2. Separação de lógica: Web vs Celular
    if (Platform.OS === 'web' && documento.file) {
      // No navegador, pegamos o arquivo real que a web gera
      formData.append('file', documento.file);
    } else {
      // No celular, enviamos via URI
      formData.append('file', {
        uri: documento.uri,
        name: documento.name,
        type: documento.mimeType ?? 'image/jpeg',
      } as any);
    }
    
    formData.append('servico_id', servicoId);
    formData.append('status', 'concluido');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Documento enviado ao servidor em Python!');
        setDocumento(null);
      } else {
        Alert.alert('Erro', 'Falha na resposta da API.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha de comunicação com o backend.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Área de Entrega do Tradutor</Text>
      
      <Button title="1. Selecionar Arquivo Traduzido" onPress={selecionarDocumento} />
      
      {documento && (
        <View style={styles.fileInfo}>
          <Text>Arquivo pronto: {documento.name}</Text>
          <Button title="2. Enviar e Finalizar Serviço" color="#28a745" onPress={enviarParaAPI} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5', borderRadius: 8, marginVertical: 10 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  fileInfo: { marginTop: 15, gap: 10 }
});