import Svg, { Circle, ClipPath, Defs, G, Polygon, Rect } from 'react-native-svg';

export function LanguageFlag({ code }: { code: 'br' | 'us' | 'es' | 'fr' | 'de' | 'it' }) {
  const clip = `flag-${code}`;
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44" aria-hidden>
      <Defs>
        <ClipPath id={clip}>
          <Circle cx="22" cy="22" r="21" />
        </ClipPath>
      </Defs>
      <Circle cx="22" cy="22" r="21" fill="#171719" stroke="#3A3A3E" />
      <>
        {code === 'br' && (
          <G clipPath={`url(#${clip})`}>
            <Rect width="44" height="44" fill="#168B46" />
            <Polygon points="22,8 39,22 22,36 5,22" fill="#F2CE3E" />
            <Circle cx="22" cy="22" r="8" fill="#21468B" />
          </G>
        )}
        {code === 'us' && (
          <G clipPath={`url(#${clip})`}>
            <Rect width="44" height="44" fill="#F3F3F3" />
            {[0, 8, 16, 24, 32, 40].map((y) => (
              <Rect key={y} y={y} width="44" height="4" fill="#CF3048" />
            ))}
            <Rect width="19" height="20" fill="#27477C" />
            <Circle cx="6" cy="6" r="1.2" fill="#FFF" />
            <Circle cx="13" cy="6" r="1.2" fill="#FFF" />
            <Circle cx="6" cy="13" r="1.2" fill="#FFF" />
            <Circle cx="13" cy="13" r="1.2" fill="#FFF" />
          </G>
        )}
        {code === 'es' && (
          <G clipPath={`url(#${clip})`}>
            <Rect width="44" height="44" fill="#B92B35" />
            <Rect y="12" width="44" height="20" fill="#F1C445" />
          </G>
        )}
        {code === 'fr' && (
          <G clipPath={`url(#${clip})`}>
            <Rect width="15" height="44" fill="#23458B" />
            <Rect x="15" width="14" height="44" fill="#F7F7F7" />
            <Rect x="29" width="15" height="44" fill="#D33249" />
          </G>
        )}
        {code === 'de' && (
          <G clipPath={`url(#${clip})`}>
            <Rect width="44" height="15" fill="#171719" />
            <Rect y="15" width="44" height="14" fill="#C83A42" />
            <Rect y="29" width="44" height="15" fill="#E4BD42" />
          </G>
        )}
        {code === 'it' && (
          <G clipPath={`url(#${clip})`}>
            <Rect width="15" height="44" fill="#238455" />
            <Rect x="15" width="14" height="44" fill="#F7F7F7" />
            <Rect x="29" width="15" height="44" fill="#CB3948" />
          </G>
        )}
      </>
    </Svg>
  );
}
