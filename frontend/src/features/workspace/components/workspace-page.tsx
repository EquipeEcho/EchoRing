import { ScrollView, useWindowDimensions, View } from 'react-native';

import { styles } from '@/features/workspace/styles/workspace.styles';

export function WorkspacePage({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.page, width < 700 && { padding: 20, paddingTop: 26 }]}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.pageInner}>{children}</View>
    </ScrollView>
  );
}
