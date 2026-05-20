// Pattern SVG generator — simple paw prints + bones + dots (no complex illustrations).
// Returns a data URL for use as a CSS background.

function buildPatternSVG(opts = {}) {
  const fg = opts.fg || '#B27347';
  const opacity = opts.opacity ?? 1;
  // 280x280 tile with scattered motifs
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
    <g fill="${fg}" opacity="${opacity}">
      <!-- paw 1 -->
      <g transform="translate(40 50) rotate(-15)">
        <ellipse cx="0" cy="6" rx="8" ry="10"/>
        <circle cx="-9" cy="-5" r="3.5"/>
        <circle cx="-3" cy="-9" r="3.5"/>
        <circle cx="4" cy="-9" r="3.5"/>
        <circle cx="9" cy="-5" r="3.5"/>
      </g>
      <!-- bone 1 -->
      <g transform="translate(180 80) rotate(25)">
        <rect x="-18" y="-3" width="36" height="6" rx="3"/>
        <circle cx="-18" cy="-3" r="5"/>
        <circle cx="-18" cy="3" r="5"/>
        <circle cx="18" cy="-3" r="5"/>
        <circle cx="18" cy="3" r="5"/>
      </g>
      <!-- paw 2 -->
      <g transform="translate(230 180) rotate(10)">
        <ellipse cx="0" cy="6" rx="6" ry="8"/>
        <circle cx="-7" cy="-3" r="2.5"/>
        <circle cx="-2" cy="-7" r="2.5"/>
        <circle cx="3" cy="-7" r="2.5"/>
        <circle cx="7" cy="-3" r="2.5"/>
      </g>
      <!-- heart -->
      <path d="M 100 180 q -8 -10 -16 -4 q -8 6 0 14 l 16 14 l 16 -14 q 8 -8 0 -14 q -8 -6 -16 4 z"/>
      <!-- dots cluster -->
      <circle cx="70" cy="220" r="2"/>
      <circle cx="80" cy="232" r="2"/>
      <circle cx="64" cy="240" r="2"/>
      <!-- small dachshund silhouette: long body with two feet -->
      <g transform="translate(150 130)">
        <rect x="-30" y="-4" width="50" height="10" rx="5"/>
        <circle cx="25" cy="-2" r="8"/>
        <rect x="-26" y="6" width="4" height="9" rx="2"/>
        <rect x="14" y="6" width="4" height="9" rx="2"/>
        <rect x="29" y="-12" width="3" height="6" rx="1.5"/>
        <rect x="-34" y="-2" width="6" height="3" rx="1.5"/>
      </g>
      <!-- tiny paw -->
      <g transform="translate(20 150) rotate(20)">
        <ellipse cx="0" cy="4" rx="5" ry="6"/>
        <circle cx="-5" cy="-2" r="2"/>
        <circle cx="-1" cy="-5" r="2"/>
        <circle cx="3" cy="-5" r="2"/>
        <circle cx="6" cy="-2" r="2"/>
      </g>
    </g>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

window.buildPatternSVG = buildPatternSVG;
