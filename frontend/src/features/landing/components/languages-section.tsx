import { View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { LanguageFlag } from '@/features/landing/components/language-flag';
import { useStyles } from '@/features/landing/styles/landing.styles';
import type { LandingSectionProps } from '@/features/landing/types';
import { useTheme } from '@/theme/theme-context';

export function LanguagesSection({ layout, onLayout }: LandingSectionProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { mobile, narrow, wide } = layout;
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.languagesSection,
        !wide && { flexDirection: 'column', alignItems: 'stretch' },
        mobile && styles.sectionMobile,
      ]}
    >
      <View style={styles.languagesCopy}>
        <Txt style={styles.eyebrow}>IDIOMAS</Txt>
        <Txt
          accessibilityRole="header"
          style={[
            styles.sectionTitle,
            mobile && styles.sectionTitleSmall,
            narrow && styles.sectionTitleNarrow,
          ]}
        >
          Falamos a língua{`\n`}
          <Txt
            style={[
              styles.sectionTitle,
              mobile && styles.sectionTitleSmall,
              narrow && styles.sectionTitleNarrow,
              { color: colors.accent },
            ]}
          >
            do seu público.
          </Txt>
        </Txt>
      </View>
      <View style={styles.languageGrid}>
        {(
          [
            ['br', 'Português'],
            ['us', 'Inglês'],
            ['es', 'Espanhol'],
            ['fr', 'Francês'],
            ['de', 'Alemão'],
            ['it', 'Italiano'],
          ] as const
        ).map(([code, language]) => (
          <View key={language} style={styles.language}>
            <LanguageFlag code={code} />
            <Txt style={styles.languageName}>{language}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
