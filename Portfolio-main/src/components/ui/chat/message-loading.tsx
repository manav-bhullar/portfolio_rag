// @hidden
export default function MessageLoading() {
  return (
    <svg
      width="48"
      height="20"
      viewBox="0 0 48 20"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <defs>
        <linearGradient id="wave-gradient" x1="0" y1="0" x2="48" y2="0">
          <stop offset="0%" stopColor="#3FB37F" />
          <stop offset="50%" stopColor="#8B5FE0" />
          <stop offset="100%" stopColor="#F0954A" />
        </linearGradient>
      </defs>
      <path
        d="M2,10 Q8,10 10,4 T18,10 T26,10 T34,10 T46,10"
        stroke="url(#wave-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 6"
      >
        <animate
          attributeName="d"
          dur="1s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45,0,0.55,1;0.45,0,0.55,1"
          values="
            M2,10 Q8,10 10,4 T18,10 T26,10 T34,10 T46,10;
            M2,10 Q8,10 10,16 T18,10 T26,10 T34,10 T46,10;
            M2,10 Q8,10 10,4 T18,10 T26,10 T34,10 T46,10
          "
        />
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-20"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
