import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import * as DocumentPicker from 'expo-document-picker';

// Define a estrutura do estado do formulário
interface FormDataState {
  name: string;
  email: string;
  phone: string;
  company: string;
  service_type: string;
  source_language: string;
  target_language: string;
  notes: string;
  opt_in_marketing: boolean;
}

export default function QuoteFormScreen(): React.JSX.Element {
  const [form, setForm] = useState<FormDataState>({
    name: '',
    email: '',
    phone: '',
    company: '',
    service_type: '',
    source_language: '',
    target_language: '',
    notes: '',
    opt_in_marketing: false,
  });

  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Atualizador de estado com verificação de tipo
  const handleChange = (field: keyof FormDataState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Seleção de ficheiro seguro
  const handlePickDocument = async (): Promise<void> => {
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
        const file = result.assets[0];
        
        // Limite de 25MB (25 * 1024 * 1024 bytes)
        if (file.size && file.size > 26214400) {
          Alert.alert('Ficheiro muito grande', 'O limite por ficheiro é de 25MB.');
          return;
        }

        setSelectedFile(file);
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível selecionar o ficheiro.');
    }
  };

  // Envio dos dados para o FastAPI
  const handleSubmit = async (): Promise<void> => {
    if (!form.name || !form.email || !form.phone || !form.service_type || !form.source_language || !form.target_language) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      
      // Adiciona os campos de texto
      (Object.keys(form) as Array<keyof FormDataState>).forEach((key) => {
        formData.append(key, String(form[key]));
      });

      // Adiciona o ficheiro
      if (selectedFile) {
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/octet-stream',
        } as unknown as Blob);
      }

      /**
       * AJUSTE DE URL PARA DOCKER:
       * - Web no browser: 'http://localhost:8000/upload/'
       * - Emulador Android: 'http://10.0.2.2:8000/upload/'
       * - Telemóvel Físico Expo Go: Use o IP local da sua máquina (ex: 'http://192.168.1.50:8000/upload/')
       */
      const API_URL = Platform.OS === 'web' 
        ? 'http://localhost:8000/upload/' 
        : 'http://10.0.2.2:8000/upload/';

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Orçamento enviado com sucesso!');
        setSelectedFile(null);
      } else {
        Alert.alert('Erro', 'Falha ao enviar a solicitação.');
      }
    } catch (error) {
      Alert.alert('Erro de conexão', 'Não foi possível ligar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        PREENCHA OS DADOS PARA SOLICITAR UM ORÇAMENTO
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nome*"
        placeholderTextColor="#888"
        value={form.name}
        onChangeText={(text) => handleChange('name', text)}
      />

      <TextInput
        style={styles.input}
        placeholder="E-mail*"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={form.email}
        onChangeText={(text) => handleChange('email', text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Telefone*"
        placeholderTextColor="#888"
        keyboardType="phone-pad"
        value={form.phone}
        onChangeText={(text) => handleChange('phone', text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Empresa"
        placeholderTextColor="#888"
        value={form.company}
        onChangeText={(text) => handleChange('company', text)}
      />

      {/* Select: Serviço */}
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.service_type}
          onValueChange={(val: string) => handleChange('service_type', val)}
          style={styles.picker}
        >
          <Picker.Item label="Serviço:*" value="" color="#888" />
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

      {/* Select: Tradução de */}
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.source_language}
          onValueChange={(val: string) => handleChange('source_language', val)}
          style={styles.picker}
        >
          <Picker.Item label="Tradução de:*" value="" color="#888" />
          <Picker.Item label="Português" value="Português" />
          <Picker.Item label="Inglês" value="Inglês" />
          <Picker.Item label="Espanhol" value="Espanhol" />
          <Picker.Item label="Alemão" value="Alemão" />
          <Picker.Item label="Italiano" value="Italiano" />
          <Picker.Item label="Francês" value="Francês" />
          <Picker.Item label="Outro" value="Outro" />
        </Picker>
      </View>

      {/* Select: Tradução para */}
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.target_language}
          onValueChange={(val: string) => handleChange('target_language', val)}
          style={styles.picker}
        >
          <Picker.Item label="Tradução para:*" value="" color="#888" />
          <Picker.Item label="Português" value="Português" />
          <Picker.Item label="Inglês" value="Inglês" />
          <Picker.Item label="Espanhol" value="Espanhol" />
          <Picker.Item label="Alemão" value="Alemão" />
          <Picker.Item label="Italiano" value="Italiano" />
          <Picker.Item label="Francês" value="Francês" />
          <Picker.Item label="Outro" value="Outro" />
        </Picker>
      </View>

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Observações gerais"
        placeholderTextColor="#888"
        multiline
        numberOfLines={3}
        value={form.notes}
        onChangeText={(text) => handleChange('notes', text)}
      />

      <Text style={styles.infoText}>
        Adicione o(s) seu(s) ficheiro(s) (Max. 25MB) | Para o envio de ficheiros acima de 25MB, favor enviar a sua solicitação através do endereço de e-mail{' '}
        <Text style={styles.linkText} onPress={() => Linking.openURL('mailto:atendimento@aliancatraducoes.com.br')}>
          atendimento@aliancatraducoes.com.br
        </Text>
      </Text>

      <TouchableOpacity style={styles.fileButton} onPress={handlePickDocument}>
        <Text style={styles.fileButtonText}>
          {selectedFile ? `Ficheiro: ${selectedFile.name}` : 'Selecionar arquivos'}
        </Text>
      </TouchableOpacity>

      <View style={styles.checkboxContainer}>
        <Checkbox
          style={styles.checkbox}
          value={form.opt_in_marketing}
          onValueChange={(val: boolean) => handleChange('opt_in_marketing', val)}
          color={form.opt_in_marketing ? '#b91c1c' : undefined}
        />
        <Text style={styles.checkboxLabel}>
          Eu concordo em receber comunicações por e-mail.
        </Text>
      </View>

      <Text style={styles.securityText}>
        Ao enviar os seus dados, concorda com a nossa{' '}
        <Text style={styles.linkText}>Política de Segurança</Text>.
      </Text>

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>ENVIAR</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3f3f46',
  },
  content: {
    padding: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#f4f4f5',
    color: '#000',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 2,
    marginBottom: 10,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f4f4f5',
    borderRadius: 2,
    marginBottom: 10,
    justifyContent: 'center',
  },
  picker: {
    color: '#000',
    height: 50,
  },
  infoText: {
    color: '#d4d4d8',
    fontSize: 11,
    lineHeight: 16,
    marginVertical: 10,
  },
  linkText: {
    color: '#f87171',
    textDecorationLine: 'underline',
  },
  fileButton: {
    backgroundColor: '#f4f4f5',
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
    borderRadius: 2,
    marginBottom: 15,
  },
  fileButtonText: {
    color: '#000000',
    fontSize: 13,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    marginRight: 8,
    width: 18,
    height: 18,
  },
  checkboxLabel: {
    color: '#ffffff',
    fontSize: 12,
  },
  securityText: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#b91c1c',
    paddingVertical: 12,
    borderRadius: 2,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});