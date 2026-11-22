import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { languageMatches, languageOptions } from '@/components/ui/fields/constants';
import { OptionSelectField } from '@/components/ui/fields/option-select-field';
import { TextInput } from '@/components/ui/text-input';
import { Txt } from '@/components/ui/text';
import { RecordPage } from '@/features/workspace/components/record-page';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { useStyles } from '@/features/workspace/styles/record-details.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function NewRequestScreen() {
  const { origin } = useLocalSearchParams<{ origin?: string }>();
  const backHref = origin === 'dashboard' ? '/dashboard' : '/operacao';
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { addRequest } = useWorkspace();
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  function submit() {
    if (![title, client, source, target].every(value => value.trim())) {
      setError('Preencha o título, o cliente e os idiomas.'); return;
    }
    if (source === target) { setError('Escolha idiomas de origem e destino diferentes.'); return; }
    addRequest({ title: title.trim(), client: client.trim(), languages: `${source} → ${target}` });
    router.replace(backHref);
  }
  return <RecordPage title="Nova requisição" eyebrow="REGISTRO INTERNO" description="Crie uma entrada rápida para iniciar o fluxo operacional."
    backLabel="Voltar aos projetos" backHref={backHref}>
        <View style={styles.formIntro}>
          <View style={styles.formIntroIcon}>
            <Plus size={21} color={colors.amber} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Badge tone="amber">Demonstração</Badge>
            <Txt style={common.caption}>
              O registro ficará disponível apenas durante esta sessão e não será enviado à empresa.
            </Txt>
          </View>
        </View>
        <View style={styles.formFields}>
          {[
            {
              number: '01',
              label: 'Título do projeto',
              value: title,
              set: setTitle,
              placeholder: 'Ex.: Tradução de contrato',
            },
            {
              number: '02',
              label: 'Cliente',
              value: client,
              set: setClient,
              placeholder: 'Nome do cliente ou empresa',
            },
          ].map((field) => (
            <View key={field.label} style={styles.field}>
              <View style={styles.fieldHeading}>
                <Txt style={styles.fieldNumber}>{field.number}</Txt>
                <Txt style={styles.label}>{field.label}</Txt>
              </View>
              <TextInput
                accessibilityLabel={field.label}
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor={colors.muted}
                value={field.value}
                onChangeText={field.set}
                maxLength={120}
              />
            </View>
          ))}
          <View style={styles.languageFields}>
            <OptionSelectField
              prefix="03"
              label="Idioma de origem"
              value={source}
              onChange={setSource}
              options={languageOptions}
              matchOption={languageMatches}
              dialogTitle="Idioma de origem"
              description="Selecione o idioma atual do material."
            />
            <OptionSelectField
              prefix="04"
              label="Idioma de destino"
              value={target}
              onChange={setTarget}
              options={languageOptions}
              matchOption={languageMatches}
              dialogTitle="Idioma de destino"
              description="Selecione o idioma da entrega."
            />
          </View>
        </View>
        {!!error && (
          <Txt accessibilityRole="alert" style={{ color: colors.red, fontSize: 12 }}>
            {error}
          </Txt>
        )}
        <View style={styles.footerActions}>
          <Button variant="ghost" onPress={() => router.replace(backHref)}>
            Cancelar
          </Button>
          <Button onPress={submit} icon={Plus}>
            Criar requisição
          </Button>
        </View>
  </RecordPage>;
}
