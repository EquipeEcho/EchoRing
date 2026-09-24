export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'rtf'];

export interface FileValidationResult {
  validFiles: any[];
  error: string | null;
}

/**
 * Valida uma lista de arquivos verificando tamanho máximo e extensões permitidas.
 */
export function validateSelectedFiles(files: any[]): FileValidationResult {
  let errorMessage: string | null = null;

  const validFiles = files.filter(file => {
    const ext = file.name?.split('.').pop()?.toLowerCase() || '';

    if (file.size > MAX_FILE_SIZE) {
      errorMessage = `O arquivo ${file.name} excede o limite máximo de 25MB.`;
      return false;
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      errorMessage = `Extensão .${ext} não permitida. Envie arquivos PDF, DOC ou DOCX.`;
      return false;
    }

    return true;
  });

  return {
    validFiles,
    error: errorMessage,
  };
}