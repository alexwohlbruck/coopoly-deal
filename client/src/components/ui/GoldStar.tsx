const STAR_ID = "gs_" + Math.random().toString(36).slice(2, 6);

export function GoldStar({ size = 16 }: { size?: number }) {
  const faceId = `${STAR_ID}_f`;
  const sheenId = `${STAR_ID}_s`;
  const shadowId = `${STAR_ID}_sh`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "-0.15em" }}
    >
      <defs>
        {/* Main face gradient — top-lit gold */}
        <linearGradient id={faceId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe566" />
          <stop offset="0.45" stopColor="#f0c14a" />
          <stop offset="1" stopColor="#c8920a" />
        </linearGradient>

        {/* Specular sheen on upper half */}
        <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Drop shadow */}
        <filter id={shadowId} x="-10%" y="-10%" width="130%" height="140%">
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.6" floodColor="#4a3000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Star points — classic 5-point */}
      <path
        d="M12 2 L14.9 8.6 L22 9.5 L16.8 14.2 L18.2 21.2 L12 17.8 L5.8 21.2 L7.2 14.2 L2 9.5 L9.1 8.6 Z"
        fill={`url(#${faceId})`}
        stroke="#9a6e00"
        strokeWidth="0.6"
        strokeLinejoin="round"
        filter={`url(#${shadowId})`}
      />

      {/* Inner bevel highlight — inset star, lighter */}
      <path
        d="M12 4.8 L14 9.4 L19 10.1 L15.3 13.5 L16.3 18.4 L12 16 L7.7 18.4 L8.7 13.5 L5 10.1 L10 9.4 Z"
        fill={`url(#${sheenId})`}
      />

      {/* Bottom-edge darkening for bezel depth */}
      <path
        d="M12 2 L14.9 8.6 L22 9.5 L16.8 14.2 L18.2 21.2 L12 17.8 L5.8 21.2 L7.2 14.2 L2 9.5 L9.1 8.6 Z"
        fill="none"
        stroke="rgba(80,50,0,0.3)"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
