// Tasarımdaki (Hukuki Asistan.dc.html) inline SVG ikon seti — lucide çizgi stili.
type IconProps = {
  size?: number;
  strokeWidth?: number;
};

function svgProps({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export const IconScales = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" />
    <path d="M12 3v18" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </svg>
);

export const IconMenu = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);

export const IconX = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const IconShield = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

export const IconShieldCheck = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconArrowRight = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const IconFile = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
    <path d="M14 2v5h5" />
  </svg>
);

export const IconCheck = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconCheckCircle = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

export const IconXCircle = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

export const IconAlertTriangle = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export const IconAlertCircle = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

export const IconMessage = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const IconClipboard = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <rect width="8" height="4" x="8" y="2" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);

export const IconCart = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </svg>
);

export const IconBuilding = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M3 21h18" />
    <path d="M6 21V9l6-6 6 6v12" />
    <path d="M10 21v-5h4v5" />
  </svg>
);

export const IconHouse = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M9 22V12h6v10" />
    <path d="M2 10.6 12 2l10 8.6" />
    <path d="M4 10v12h16V10" />
  </svg>
);

export const IconDownload = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

export const IconLock = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const IconSend = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

export const IconClock = (p: IconProps = {}) => (
  <svg {...svgProps(p)}>
    <path d="M12 2v4" />
    <circle cx="12" cy="14" r="8" />
  </svg>
);
