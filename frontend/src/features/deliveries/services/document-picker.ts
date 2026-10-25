import * as DocumentPicker from 'expo-document-picker';

const allowedExtensions = /\.(pdf|docx|txt)$/i;

const maxBytes = 5 * 1024 * 1024;

export async function selectTranslationDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled) return null;
  const assets = result.assets;
  if (!assets.length || assets.some((asset) => !allowedExtensions.test(asset.name)))
    throw new Error('Escolha apenas documentos PDF, DOCX ou TXT.');
  if (assets.length > 10) throw new Error('Selecione no máximo 10 documentos por versão.');
  if (
    assets.some((asset) => asset.size === 0 || (asset.size !== undefined && asset.size > maxBytes))
  )
    throw new Error('Cada documento deve ter entre 1 byte e 5 MB.');
  if (assets.reduce((total, asset) => total + (asset.size || 0), 0) > 20 * 1024 * 1024)
    throw new Error('Os documentos devem ter no máximo 20 MB no total.');
  return assets;
}
