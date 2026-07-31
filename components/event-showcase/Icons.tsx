'use client'

import React from 'react'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
}

/** Custom Duotone Calendar Icon */
export function CalendarIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect x="3" y="4" width="18" height="17" rx="4" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 9H21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="13" r="1.25" fill="#BF8430" />
      <circle cx="12" cy="13" r="1.25" fill="currentColor" />
      <circle cx="16" cy="13" r="1.25" fill="currentColor" />
      <circle cx="8" cy="17" r="1.25" fill="currentColor" />
      <circle cx="12" cy="17" r="1.25" fill="#BF8430" />
      <circle cx="16" cy="17" r="1.25" fill="currentColor" />
    </svg>
  )
}

/** Precision Duotone Chronometer Clock Icon */
export function ClockIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7V12L15.5 14.5" stroke="#BF8430" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

/** 3D Map Location Pin Icon */
export function LocationIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path
        d="M12 21C12 21 19 14.5 19 9.5C19 5.63401 15.866 2.5 12 2.5C8.13401 2.5 5 5.63401 5 9.5C5 14.5 12 21 12 21Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="3" fill="#BF8430" />
      <circle cx="12" cy="9.5" r="1.25" fill="#0C0B09" />
    </svg>
  )
}

/** Custom Architectural Pass Ticket Icon */
export function TicketIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path
        d="M2 9C3.65685 9 5 7.65685 5 6C5 4.89543 5.89543 4 7 4H17C18.1046 4 19 4.89543 19 6C19 7.65685 20.3431 9 22 9V15C20.3431 15 19 16.3431 19 18C19 19.1046 18.1046 20 17 20H7C5.89543 20 5 19.1046 5 18C5 16.3431 3.65685 15 2 15V9Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 7V17" stroke="#BF8430" strokeWidth="1.75" strokeDasharray="2 2" />
    </svg>
  )
}

/** Speaker Megaphone / Mic Icon */
export function SpeakerIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path
        d="M12 14C14.2091 14 16 12.2091 16 10C16 7.79086 14.2091 6 12 6C9.79086 6 8 7.79086 8 10C8 12.2091 9.79086 14 12 14Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M6 21C6 17.6863 8.68629 15 12 15C15.3137 15 18 17.6863 18 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 2V4" stroke="#BF8430" strokeWidth="2" strokeLinecap="round" />
      <path d="M18.364 4.36396L16.9497 5.77817" stroke="#BF8430" strokeWidth="2" strokeLinecap="round" />
      <path d="M5.63604 4.36396L7.05025 5.77817" stroke="#BF8430" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Agenda Schedule Itinerary Icon */
export function AgendaIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="3" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 7H16" stroke="#BF8430" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 11H16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8 15H13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

/** Glowing FAQ Question Icon */
export function FaqIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.8214 2.48697 15.5291 3.33782 17L2.5 21.5L7 20.6622C8.47087 21.513 10.1786 22 12 22Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 9C9.5 7.61929 10.6193 6.5 12 6.5C13.3807 6.5 14.5 7.61929 14.5 9C14.5 10.15 13.7 11.1 12.6 11.4L12 11.6V14" stroke="#BF8430" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.25" fill="#BF8430" />
    </svg>
  )
}

/** Share Connected Node Icon */
export function ShareIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <circle cx="18" cy="5" r="3" fill="#BF8430" fillOpacity="0.2" stroke="#BF8430" strokeWidth="1.75" />
      <circle cx="6" cy="12" r="3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="18" cy="19" r="3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8.59 13.51L15.42 17.49" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

/** Shield Verified Crest Icon */
export function ShieldVerifiedIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path
        d="M12 2L4 5V11C4 16.52 7.41 21.58 12 23C16.59 21.58 20 16.52 20 11V5L12 2Z"
        fill="#3A5F3B"
        fillOpacity="0.15"
        stroke="#3A5F3B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 12L11 14L15 10" stroke="#3A5F3B" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Sparkles Starburst Icon */
export function SparklesIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path
        d="M12 3C12 7.97056 7.97056 12 3 12C7.97056 12 12 16.0294 12 21C12 16.0294 16.0294 12 21 12C16.0294 12 12 7.97056 12 3Z"
        fill="#BF8430"
        fillOpacity="0.3"
        stroke="#BF8430"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M19 3C19 4.98823 17.3882 6.6 15.4 6.6C17.3882 6.6 19 8.21177 19 10.2C19 8.21177 20.6118 6.6 22.6 6.6C20.6118 6.6 19 4.98823 19 3Z"
        fill="#D4A050"
      />
    </svg>
  )
}

/** Unfolded Map Icon */
export function MapIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path
        d="M9 18L3 21V6L9 3M9 18L15 21M9 18V3M15 21L21 18V3L15 6M15 21V6M15 6L9 3"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Chevron Down Icon */
export function ChevronDownIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M6 9L12 15L18 9" />
    </svg>
  )
}

/** External Link Icon */
export function ExternalLinkIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M18 13V19C18 20.1046 17.1046 21 16 21H5C3.89543 21 3 20.1046 3 19V8C3 6.89543 3.89543 6 5 6H11" />
      <path d="M15 3H21V9" />
      <path d="M10 14L21 3" />
    </svg>
  )
}

/** Download Arrow Icon */
export function DownloadIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" />
      <path d="M7 10L12 15L17 10" />
      <path d="M12 15V3" />
    </svg>
  )
}

/** Checkmark Icon */
export function CheckIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M20 6L9 17L4 12" />
    </svg>
  )
}

/** Success Check Circle Icon */
export function CheckCircleIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <circle cx="12" cy="12" r="9" fill="#3A5F3B" fillOpacity="0.2" stroke="#3A5F3B" strokeWidth="1.75" />
      <path d="M8 12L11 15L16 9" stroke="#3A5F3B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Error X Circle Icon */
export function XCircleIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <circle cx="12" cy="12" r="9" fill="#7A2E18" fillOpacity="0.2" stroke="#7A2E18" strokeWidth="1.75" />
      <path d="M15 9L9 15M9 9L15 15" stroke="#7A2E18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Animated Spinner Icon */
export function LoaderSpinnerIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className}`} {...props}>
      <path d="M21 12A9 9 0 1 1 6.219 4.908" />
    </svg>
  )
}

/** Forward Arrow Icon */
export function ArrowRightIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M5 12H19" />
      <path d="M12 5L19 12L12 19" />
    </svg>
  )
}

/** Metallic Credit Card Icon */
export function CreditCardIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="3" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.75" />
      <path d="M2 10H22" stroke="currentColor" strokeWidth="1.75" />
      <rect x="5" y="14" width="4" height="2" rx="0.5" fill="#BF8430" />
    </svg>
  )
}

/** Warning Alert Triangle Icon */
export function AlertTriangleIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path
        d="M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55103 19.3437 1.64155 19.686 1.8145 19.9871C1.98745 20.2883 2.23675 20.5372 2.53762 20.7091C2.83849 20.8809 3.18012 20.97 3.53 20.97H20.47C20.8199 20.97 21.1615 20.8809 21.4624 20.7091C21.7633 20.5372 22.0125 20.2883 22.1855 19.9871C22.3585 19.686 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56613 13.2807 3.32314 12.9812 3.15444C12.6817 2.98574 12.3437 2.89746 12 2.89746C11.6563 2.89746 11.3183 2.98574 11.0188 3.15444C10.7193 3.32314 10.4683 3.56613 10.29 3.86Z"
        fill="#7A2E18"
        fillOpacity="0.15"
        stroke="#7A2E18"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 9V13" stroke="#7A2E18" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="#7A2E18" />
    </svg>
  )
}

/** Company Building Icon */
export function BuildingIcon({ size = 16, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 6H11M13 6H15M9 10H11M13 10H15M9 14H11M13 14H15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10 22V18H14V22" stroke="#BF8430" strokeWidth="1.75" />
    </svg>
  )
}

/** User Profile Avatar Icon */
export function UserIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <circle cx="12" cy="8" r="4" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 20C5 16.134 8.13401 13 12 13C15.866 13 19 16.134 19 20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

/** File Text Document Icon */
export function FileTextIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M8 13H16" stroke="#BF8430" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8 17H14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
