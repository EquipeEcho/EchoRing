import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { type Attachment } from '@/types/translation';

const allowedAttachment = /\.(pdf|docx|txt)$/i;

const maxAttachmentBytes = 2 * 1024 * 1024;

const maxAttachmentsTotal = 5 * 1024 * 1024;

function validateAttachments(files: { name: string; size?: number }[]) {
  if (
    files.length > 3 ||
    files.some((file) => file.size !== undefined && file.size > maxAttachmentBytes) ||
    files.reduce((sum, file) => sum + (file.size || 0), 0) > maxAttachmentsTotal
  ) {
    throw new Error('Anexe até 3 arquivos, com até 2 MB cada e 5 MB no total.');
  }
  if (files.some((file) => !allowedAttachment.test(file.name) || file.size === 0)) {
    throw new Error('Escolha documentos PDF, DOCX ou TXT não vazios.');
  }
}

export async function selectDocuments(): Promise<Attachment[]> {
  if (Platform.OS !== 'web') {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ],
      copyToCacheDirectory: Platform.OS !== 'android',
      multiple: true,
    });
    if (result.canceled) return [];
    validateAttachments(result.assets);
    const attachments = await Promise.all(
      result.assets.map(async (asset) => {
        const content = await new File(asset.uri).base64();
        const padding = content.endsWith('==') ? 2 : content.endsWith('=') ? 1 : 0;
        return { name: asset.name, size: Math.floor((content.length * 3) / 4) - padding, content };
      }),
    );
    validateAttachments(attachments);
    return attachments;
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.txt';
    input.multiple = true;
    input.oncancel = () => resolve([]);
    input.onchange = async () => {
      try {
        const files = [...(input.files || [])];
        validateAttachments(files);
        const attachments = await Promise.all(
          files.map(
            (file) =>
              new Promise<Attachment>((ok, fail) => {
                const reader = new FileReader();
                reader.onerror = () => fail(new Error('Não foi possível ler o documento.'));
                reader.onload = () =>
                  ok({
                    name: file.name,
                    size: file.size,
                    content: String(reader.result).split(',')[1],
                  });
                reader.readAsDataURL(file);
              }),
          ),
        );
        resolve(attachments);
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
