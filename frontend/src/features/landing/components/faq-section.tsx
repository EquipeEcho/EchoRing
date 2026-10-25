import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useStyles } from '@/features/landing/styles/landing.styles';
import type { LandingSectionProps } from '@/features/landing/types';
import { useTheme } from '@/theme/theme-context';

export function FaqSection({ layout }: LandingSectionProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { mobile, narrow } = layout;
  const [faq, setFaq] = useState<number | null>(null);
  return (
    <View testID="landing-faq" style={[styles.faqSection, mobile && styles.faqSectionMobile]}>
      <Txt
        accessibilityRole="header"
        style={[
          styles.sectionTitle,
          mobile && styles.sectionTitleSmall,
          narrow && styles.sectionTitleNarrow,
        ]}
      >
        Antes do primeiro olá.
      </Txt>
      {[
        [
          'Como é calculado o orçamento?',
          'A proposta considera os idiomas, o tipo de conteúdo, o volume e o prazo. Nossa equipe analisa a solicitação antes de informar o valor.',
        ],
        [
          'Preciso anexar o documento agora?',
          'Você pode começar descrevendo o projeto. Para um orçamento mais preciso, anexe o material ou informe o número de páginas e palavras.',
        ],
        [
          'E se meu idioma não estiver na página?',
          'Informe o idioma de origem e de destino no formulário. A equipe verifica a disponibilidade e retorna por e-mail.',
        ],
      ].map(([question, answer], index) => (
        <View key={question} style={styles.faq}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: faq === index }}
            aria-expanded={faq === index}
            onPress={() => setFaq(faq === index ? null : index)}
            style={styles.faqQuestion}
          >
            <Txt style={styles.faqTitle}>{question}</Txt>
            {faq === index ? (
              <X size={19} color={colors.accent} />
            ) : (
              <Plus size={19} color={colors.accent} />
            )}
          </Pressable>
          {faq === index && <Txt style={styles.faqAnswer}>{answer}</Txt>}
        </View>
      ))}
    </View>
  );
}
