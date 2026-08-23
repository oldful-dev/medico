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

// --- Spec Added Icons ---
export const TicketIcon: React.FC<IconProps> = ({ size = 24, color = "#4F46E5" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M4 18h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2zm2-10h12v2H6V8zm0 4h12v2H6v-2z" />
    </Svg>
);

export const WheelchairIcon: React.FC<IconProps> = ({ size = 24, color = "#2563EB" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 4.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm1 14.5a5 5 0 0 1-5-5H6a7 7 0 0 0 7 7h1v-2h-1zm5-5a5 5 0 0 1-5 5v2a7 7 0 0 0 7-7h-2zm-6-5h-4v4h2v-2h2v-2zm3 0h-1v4.5l-2.5 2.5 1.4 1.4 2.1-2.1V9zm-5-3a5 5 0 0 0-5 5h2a3 3 0 0 1 3-3V6z" />
    </Svg>
);

export const FolderIcon: React.FC<IconProps> = ({ size = 24, color = "#EA580C" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </Svg>
);

export const MapPinIcon: React.FC<IconProps> = ({ size = 24, color = "#DC2626" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </Svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 24, color = "#059669" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
    </Svg>
);

export const UsersIcon: React.FC<IconProps> = ({ size = 24, color = "#7C3AED" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 8 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </Svg>
);

export const AppleIcon: React.FC<IconProps> = ({ size = 24, color = "#16A34A" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.52-.64.74-1.2 1.88-1.05 3 .9.07 2.06-.57 2.7-1.3l.3-.46z" />
    </Svg>
);

export const CoffeeIcon: React.FC<IconProps> = ({ size = 24, color = "#B45309" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M4 19h16v2H4v-2zm16-9v3c0 2.76-2.24 5-5 5H9c-2.76 0-5-2.24-5-5V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v4h2c1.1 0 2 .9 2 2zm-4-6H6v9c0 1.66 1.34 3 3 3h6c1.66 0 3-1.34 3-3V4zm2 6h-2v4h2v-4z" />
    </Svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ size = 24, color = "#0F172A" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 19.92C8.38 19.74 5 15.25 5 11V6.3l7-3.11 7 3.11V11c0 4.25-3.38 8.74-7 9.92z" />
    </Svg>
);

export const PortalIcon: React.FC<IconProps> = ({ size = 24, color = "#0284C7" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </Svg>
);

export const CheckAllIcon: React.FC<IconProps> = ({ size = 24, color = "#16A34A" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.42 11.93l-1.41 1.41 5.66 5.66 12-12-1.41-1.42z" />
    </Svg>
);

export const StarIcon: React.FC<IconProps> = ({ size = 24, color = "#EAB308" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </Svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = 24, color = "#2563EB" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </Svg>
);

export const TempleIcon: React.FC<IconProps> = ({ size = 24, color = "#B45309" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2L1 9h22L12 2zm0 18c-1.1 0-2-.9-2-2v-4h4v4c0 1.1-.9 2-2 2zm10-9H2v2h20v-2z" />
    </Svg>
);

export const HospitalIcon: React.FC<IconProps> = ({ size = 24, color = "#DC2626" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z" />
    </Svg>
);

export const CarIcon: React.FC<IconProps> = ({ size = 24, color = "#2563EB" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </Svg>
);

export const WrenchIcon: React.FC<IconProps> = ({ size = 24, color = "#4B5563" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.3C.5 6.7.9 9.8 2.9 11.8c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.5z" />
    </Svg>
);

export const DiscountIcon: React.FC<IconProps> = ({ size = 24, color = "#059669" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
    </Svg>
);

export const ReceiptIcon: React.FC<IconProps> = ({ size = 24, color = "#0284C7" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z" />
    </Svg>
);

export const SmartphoneIcon: React.FC<IconProps> = ({ size = 24, color = "#4F46E5" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14zm-5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
    </Svg>
);

export const ShoppingBagIcon: React.FC<IconProps> = ({ size = 24, color = "#EA580C" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-2.76 0-5-2.24-5-5h2c0 1.66 1.34 3 3 3s3-1.34 3-3h2c0 2.76-2.24 5-5 5z" />
    </Svg>
);

export const BriefcaseIcon: React.FC<IconProps> = ({ size = 24, color = "#78350F" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
    </Svg>
);

export const SparklesIcon: React.FC<IconProps> = ({ size = 24, color = "#D97706" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2l2.4 4.9L19.5 8l-3.9 3.8.9 5.4-4.5-2.4-4.5 2.4.9-5.4-3.9-3.8 5.1-1.1L12 2zm7 12l1 2 2.1.3-1.5 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.5-1.5 2.1-.3 1-2z" />
    </Svg>
);

export const DropletIcon: React.FC<IconProps> = ({ size = 24, color = "#0284C7" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </Svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ size = 24, color = "#059669" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 15l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
    </Svg>
);

export const PlusCircleIcon: React.FC<IconProps> = ({ size = 24, color = "#4F46E5" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
    </Svg>
);

export const MealIcon: React.FC<IconProps> = ({ size = 24, color = "#D97706" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
    </Svg>
);

// Map of canonical benefitCode to SVG components
export const BENEFIT_SVG_MAP: Record<string, React.FC<IconProps>> = {
    SOS: SOSIcon,
    SIREN: SOSIcon,
    TELECONSULT: DoctorIcon,
    STETHOSCOPE: DoctorIcon,
    MEDICINE: MedicineIcon,
    PILL: MedicineIcon,
    MEDICINE_DELIVERY: MedicineIcon,
    BLOOD_TEST: BloodTestIcon,
    BLOOD_DROP: BloodTestIcon,
    SUPPORT: SupportIcon,
    PHONE: SupportIcon,
    COMPANIONSHIP_CALL: SupportIcon,
    PHONE_SUPPORT: SupportIcon,
    HEADSET: SupportIcon,
    FAMILY_PORTAL: PortalIcon,
    PORTAL: PortalIcon,
    BASE_PLAN: CheckAllIcon,
    CHECK_ALL: CheckAllIcon,
    CARE_MANAGER: StarIcon,
    STAR: StarIcon,
    CAREGIVER_VISIT: CaregiverIcon,
    CAREGIVER: CaregiverIcon,
    USER: CaregiverIcon,
    NURSE_VISIT: NurseIcon,
    NURSE: NurseIcon,
    SPIRITUAL_ESCORT: TempleIcon,
    TEMPLE: TempleIcon,
    LOCAL_MEETUP: UsersIcon,
    USERS: UsersIcon,
    HOSPITAL_ACCOMPANIMENT: HospitalIcon,
    HOSPITAL: HospitalIcon,
    PICKUP_DROP: CarIcon,
    CAR: CarIcon,
    HANDYMEN: WrenchIcon,
    WRENCH: WrenchIcon,
    ZERO_SERVICE_FEE: DiscountIcon,
    DISCOUNT: DiscountIcon,
    BILL_PAYMENT: ReceiptIcon,
    RECEIPT: ReceiptIcon,
    TECH_SUPPORT: SmartphoneIcon,
    SMARTPHONE: SmartphoneIcon,
    GROCERY_ASSIST: ShoppingBagIcon,
    GROCERY: ShoppingBagIcon,
    SHOPPING_BAG: ShoppingBagIcon,
    PAPERWORK_ASSIST: BriefcaseIcon,
    PAPERWORK: BriefcaseIcon,
    BRIEFCASE: BriefcaseIcon,
    DEEP_CLEANING: SparklesIcon,
    SPARKLES: SparklesIcon,
    SANITATION: DropletIcon,
    DROPLET: DropletIcon,
    HOME_AUDIT: ShieldCheckIcon,
    SHIELD_CHECK: ShieldCheckIcon,
    CUSTOM_REQUEST: PlusCircleIcon,
    PLUS_CIRCLE: PlusCircleIcon,
    TICKET: TicketIcon,
    WHEELCHAIR: WheelchairIcon,
    FOLDER: FolderIcon,
    MAP_PIN: MapPinIcon,
    CLOCK: ClockIcon,
    COFFEE: CoffeeIcon,
    SHIELD: ShieldIcon,
    MEAL_SERVICE: MealIcon,
    MEAL: MealIcon,
};

export function renderBenefitSvg(code: string, size = 18, color?: string) {
    const Component = BENEFIT_SVG_MAP[code.toUpperCase()] || DefaultIcon;
    return <Component size={size} color={color} />;
}
