import { Platform } from 'react-native';

export function downloadDemoDocument(name: string) {
  if (Platform.OS !== 'web') return;
  const content = `Echo Ring · documento demonstrativo\n\nArquivo: ${name}\nEste conteúdo existe apenas para visualizar o fluxo local de avaliação e entrega.`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
