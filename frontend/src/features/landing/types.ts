import type { LayoutChangeEvent } from 'react-native';

import type { LandingLayout } from '@/features/landing/hooks/use-landing-layout';

export type LandingSection = 'top' | 'services' | 'languages' | 'process' | 'quote';
export type NavigateSection = (section: LandingSection) => void;
export type LandingSectionProps = {
  layout: LandingLayout;
  onLayout?: (event: LayoutChangeEvent) => void;
};
