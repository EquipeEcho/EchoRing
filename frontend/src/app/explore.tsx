import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';

// AVISO: Substitua pelo IP da sua máquina local onde o backend FastAPI está rodando.
// Não use 'localhost' se estiver testando em dispositivo físico ou no Expo Go (use o IP ex: 192.168.x.x).
const API_URL = 'http://localhost:8000/upload/'; 

export default function FormularioSolicitacao() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [servico, setServico] = useState('');
  const [tradDe, setTradDe] = useState('');
  const [tradPara, setTradPara] = useState('');
  const [observacao, setObservacao] = useState('');
  
  const [arquivo, setArquivo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Selecionar documento (PDF, DOC, DOCX)
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setArquivo(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Erro', 'Ocorreu um erro ao selecionar o arquivo.');
    }
  };

  // Enviar formulário multipart/form-data para a rota FastAPI
  const handleEnviar = async () => {
    if (!nome || !email) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha o Nome e o E-mail.');
      return;
    }

    if (!arquivo) {
      Alert.alert('Arquivo Obrigatório', 'Por favor, selecione um arquivo para envio.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('email', email);
      if (telefone) formData.append('telefone', telefone);
      if (empresa) formData.append('empresa', empresa);
      if (servico) formData.append('servico', servico);
      if (tradDe) formData.append('trad_de', tradDe);
      if (tradPara) formData.append('trad_para', tradPara);
      if (observacao) formData.append('observacao', observacao);

      // Anexa o arquivo com tipo correto para o React Native
      formData.append('file', {
        uri: Platform.OS === 'ios' ? arquivo.uri.replace('file://', '') : arquivo.uri,
        name: arquivo.name || 'documento.pdf',
        type: arquivo.mimeType || 'application/pdf',
      } as any);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const responseData = await response.json();

      if (response.ok) {
        Alert.alert('Sucesso', 'Solicitação enviada com sucesso!');
        // Resetar campos
        setNome('');
        setEmail('');
        setTelefone('');
        setEmpresa('');
        setServico('');
        setTradDe('');
        setTradPara('');
        setObservacao('');
        setArquivo(null);
      } else {
        Alert.alert('Erro no envio', responseData.detail || 'Ocorreu um erro ao processar sua solicitação.');
      }
    } catch (error) {
      Alert.alert('Erro de Conexão', 'Não foi possível conectar ao servidor.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Nova Solicitação</Text>

      {/* Nome */}
      <Text style={styles.label}>Nome:*</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Digite seu nome completo"
      />

      {/* Email */}
      <Text style={styles.label}>E-mail:*</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Digite seu e-mail"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Telefone */}
      <Text style={styles.label}>Telefone:</Text>
      <TextInput
        style={styles.input}
        value={telefone}
        onChangeText={setTelefone}
        placeholder="(00) 00000-0000"
        keyboardType="phone-pad"
      />

      {/* Empresa */}
      <Text style={styles.label}>Empresa:</Text>
      <TextInput
        style={styles.input}
        value={empresa}
        onChangeText={setEmpresa}
        placeholder="Nome da empresa (opcional)"
      />

      {/* Serviço */}
      <Text style={styles.label}>Serviço:*</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={servico}
          onValueChange={(itemValue) => setServico(itemValue)}
        >
          <Picker.Item label="Serviço:*" value="" />
          <Picker.Item label="Tradução Simples" value="Tradução Simples" />
          <Picker.Item label="Tradução Juramentada" value="Tradução Juramentada" />
          <Picker.Item label="Interpretação Simultânea" value="Interpretação Simultânea" />
          <Picker.Item label="Interpretação em Libras" value="Interpretação em Libras" />
          <Picker.Item label="Revisão de documento" value="Revisão de documento" />
          <Picker.Item label="Transcrição" value="Transcrição" />
          <Picker.Item label="Legendagem" value="Legendagem" />
          <Picker.Item label="Outros" value="Outros" />
        </Picker>
      </View>

      {/* Tradução de: */}
      <Text style={styles.label}>Tradução de:*</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={tradDe}
          onValueChange={(itemValue) => setTradDe(itemValue)}
        >
          <Picker.Item label="Tradução de:*" value="" />
          <Picker.Item label="Português" value="Português" />
          <Picker.Item label="Inglês" value="Inglês" />
          <Picker.Item label="Espanhol" value="Espanhol" />
          <Picker.Item label="Alemão" value="Alemão" />
          <Picker.Item label="Italiano" value="Italiano" />
          <Picker.Item label="Francês" value="Francês" />
          <Picker.Item label="Outro" value="Outro" />
        </Picker>
      </View>

      {/* Tradução para: */}
      <Text style={styles.label}>Tradução para:*</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={tradPara}
          onValueChange={(itemValue) => setTradPara(itemValue)}
        >
          <Picker.Item label="Tradução para:*" value="" />
          <Picker.Item label="Português" value="Português" />
          <Picker.Item label="Inglês" value="Inglês" />
          <Picker.Item label="Espanhol" value="Espanhol" />
          <Picker.Item label="Alemão" value="Alemão" />
          <Picker.Item label="Italiano" value="Italiano" />
          <Picker.Item label="Francês" value="Francês" />
          <Picker.Item label="Outro" value="Outro" />
        </Picker>
      </View>

      {/* Observações */}
      <Text style={styles.label}>Observações:</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={observacao}
        onChangeText={setObservacao}
        placeholder="Informações adicionais..."
        multiline
        numberOfLines={4}
      />

      {/* Botão de Selecionar Arquivo */}
      <TouchableOpacity style={styles.fileButton} onPress={pickDocument}>
        <Text style={styles.fileButtonText}>
          {arquivo ? `Arquivo: ${arquivo.name}` : 'Selecionar arquivo (PDF, DOC, DOCX)'}
        </Text>
      </TouchableOpacity>

      {/* Botão de Envio */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleEnviar}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitButtonText}>Enviar Solicitação</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    marginBottom: 15,
    overflow: 'hidden',
  },
  fileButton: {
    backgroundColor: '#E0E0E0',
    borderWidth: 1,
    borderColor: '#B0B0B0',
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  fileButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#88BBE8',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});