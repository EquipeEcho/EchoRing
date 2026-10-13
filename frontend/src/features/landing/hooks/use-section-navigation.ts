import { useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Platform, ScrollView } from 'react-native';

import type { LandingSection } from '@/features/landing/types';

export function useSectionNavigation() {
  const scroll = useRef<ScrollView>(null);
  const sections = useRef<Record<string, number>>({});
  function go(section: LandingSection) {
    const reduced =
      Platform.OS === 'web' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroll.current?.scrollTo({ y: sections.current[section] ?? 0, animated: !reduced });
  }
  function registerSection(section: LandingSection) {
    return (event: LayoutChangeEvent) => {
      sections.current[section] = event.nativeEvent.layout.y;
    };
  }
  return { scroll, go, registerSection };
}
