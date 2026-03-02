import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

export function getDeviceType() {
  const w = Dimensions.get('window').width;
  if (w < BREAKPOINTS.mobile) return 'mobile';
  if (w < BREAKPOINTS.tablet) return 'tablet';
  if (w < BREAKPOINTS.desktop) return 'desktop';
  return 'wide';
}

export function isWeb() {
  return Platform.OS === 'web';
}

export function responsiveValue(mobile, tablet, desktop) {
  const w = Dimensions.get('window').width;
  if (w >= BREAKPOINTS.desktop) return desktop ?? tablet ?? mobile;
  if (w >= BREAKPOINTS.tablet) return tablet ?? mobile;
  return mobile;
}

export function responsiveColumns(mobile = 1, tablet = 2, desktop = 3) {
  return responsiveValue(mobile, tablet, desktop);
}

export function responsivePadding() {
  return responsiveValue(16, 24, 40);
}

export function responsiveFontSize(base) {
  return responsiveValue(base, base * 1.05, base * 1.1);
}

export function containerMaxWidth() {
  const w = Dimensions.get('window').width;
  if (w >= BREAKPOINTS.wide) return 1200;
  if (w >= BREAKPOINTS.desktop) return 960;
  return '100%';
}

export function webStyle() {
  if (!isWeb()) return {};
  return {
    maxWidth: containerMaxWidth(),
    marginHorizontal: 'auto',
    width: '100%',
  };
}
