import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useLandingLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mobile = width < 760;
  const narrow = width < 380;
  const short = height < 700;
  const wide = width >= 1000;
  const pageGutter = narrow ? 12 : mobile ? 20 : 48;
  const headerHeight = mobile ? 76 : 96;
  const availableHeight = height - insets.top - insets.bottom;
  const heroHeight = Math.max(mobile ? (short ? 440 : 540) : 520, availableHeight - headerHeight);
  const heroType = {
    fontSize:
      width < 360
        ? short
          ? 34
          : 36
        : mobile
          ? short
            ? 40
            : 44
          : wide && width < 1200
            ? 58
            : wide
              ? 80
              : 68,
    lineHeight:
      width < 360
        ? short
          ? 39
          : 42
        : mobile
          ? short
            ? 45
            : 50
          : wide && width < 1200
            ? 65
            : wide
              ? 87
              : 75,
    letterSpacing: width < 360 ? -1.3 : mobile ? -1.5 : -3.4,
  };
  return {
    width,
    height,
    mobile,
    narrow,
    short,
    wide,
    pageGutter,
    headerHeight,
    heroHeight,
    heroType,
  };
}

export type LandingLayout = ReturnType<typeof useLandingLayout>;
