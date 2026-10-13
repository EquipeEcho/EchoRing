import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { styles } from '@/features/landing/styles/landing.styles';
import type { LandingSectionProps } from '@/features/landing/types';

export function ProcessSection({ layout, onLayout }: LandingSectionProps) {
  const { mobile, narrow } = layout;
  return (
    <View onLayout={onLayout} style={[styles.section, mobile && styles.sectionMobile]}>
      <Txt style={styles.eyebrow}>DO PRIMEIRO OLÁ À ENTREGA</Txt>
      <Txt
        accessibilityRole="header"
        style={[
          styles.sectionTitle,
          mobile && styles.sectionTitleSmall,
          narrow && styles.sectionTitleNarrow,
        ]}
      >
        Simples para você.{'\n'}Cuidadoso em cada detalhe.
      </Txt>
      <View style={[styles.steps, mobile && { flexDirection: 'column', gap: 32 }]}>
        {[
          [
            'Conte o que precisa',
            'Escolha os idiomas, descreva o projeto e anexe seus documentos.',
          ],
          [
            'Receba uma proposta',
            'Nossa equipe analisa o material e envia prazo e orçamento por e-mail.',
          ],
          ['Dê o próximo passo', 'Após a aprovação, alinhamos o início e a entrega da tradução.'],
        ].map(([title, text], index) => (
          <View
            key={title}
            style={[styles.step, mobile && { flex: 0, flexShrink: 0, flexBasis: 'auto' }]}
          >
            <View style={styles.stepLine}>
              <Txt style={styles.stepNumber}>0{index + 1}</Txt>
              <View style={styles.stepRule} />
            </View>
            <Txt style={styles.stepTitle}>{title}</Txt>
            <Txt style={styles.stepText}>{text}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
