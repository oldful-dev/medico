import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
}

export const SOSIcon: React.FC<IconProps> = ({ size = 24, color = "#EA4335" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </Svg>
);

export const DoctorIcon: React.FC<IconProps> = ({ size = 24, color = "#048357" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 3c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2s2-.9 2-2V5c0-1.1-.9-2-2-2zm6 5h-1V5c0-2.76-2.24-5-5-5S7 2.24 7 5v3H6c-1.1 0-2 .9-2 2v3c0 4.07 3.06 7.43 7 7.93V21h-2v3h6v-3h-2v-2.07c3.94-.5 7-3.86 7-7.93v-3c0-1.1-.9-2-2-2zm-6 11c-3.31 0-6-2.69-6-6v-3h12v3c0 3.31-2.69 6-6 6z" />
    </Svg>
);

export const MedicineIcon: React.FC<IconProps> = ({ size = 24, color = "#EA580C" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M6 3h12c1.66 0 3 1.34 3 3v12c0 1.66-1.34 3-3 3H6c-1.66 0-3-1.34-3-3V6c0-1.66 1.34-3 3-3zm0 2c-.55 0-1 .45-1 1v5h14V6c0-.55-.45-1-1-1H6zm14 8H4v5c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-5zm-11 2h6v2H9v-2z" />
    </Svg>
);

export const BloodTestIcon: React.FC<IconProps> = ({ size = 24, color = "#EF4444" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </Svg>
);

export const SupportIcon: React.FC<IconProps> = ({ size = 24, color = "#2563EB" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2C6.48 2 2 6.48 2 12v5c0 1.66 1.34 3 3 3h3v-8H4v-2c0-4.41 3.59-8 8-8s8 3.59 8 8v2h-4v8h3c1.66 0 3-1.34 3-3v-5c0-5.52-4.48-10-10-10z" />
    </Svg>
);

export const CaregiverIcon: React.FC<IconProps> = ({ size = 24, color = "#7C3AED" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </Svg>
);

export const NurseIcon: React.FC<IconProps> = ({ size = 24, color = "#EC4899" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z" />
    </Svg>
);

export const HomeAuditIcon: React.FC<IconProps> = ({ size = 24, color = "#6366F1" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm1 9h-2v-2h2v2zm0 4h-2v-2h2v2z" />
    </Svg>
);

export const GroceryIcon: React.FC<IconProps> = ({ size = 24, color = "#10B981" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
    </Svg>
);

export const DefaultIcon: React.FC<IconProps> = ({ size = 24, color = "#9CA3AF" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </Svg>
);

// Map of canonical benefitCode to SVG components
export const BENEFIT_SVG_MAP: Record<string, React.FC<IconProps>> = {
    SOS: SOSIcon,
    TELECONSULT: DoctorIcon,
    MEDICINE: MedicineIcon,
    BLOOD_TEST: BloodTestIcon,
    PHONE_SUPPORT: SupportIcon,
    SUPPORT: SupportIcon,
    CAREGIVER_VISIT: CaregiverIcon,
    CAREGIVER: CaregiverIcon,
    NURSE_VISIT: NurseIcon,
    NURSE: NurseIcon,
    HOME_AUDIT: HomeAuditIcon,
    GROCERY_ASSIST: GroceryIcon,
    GROCERY: GroceryIcon,
};

export function renderBenefitSvg(code: string, size = 18, color?: string) {
    const Component = BENEFIT_SVG_MAP[code.toUpperCase()] || DefaultIcon;
    return <Component size={size} color={color} />;
}
