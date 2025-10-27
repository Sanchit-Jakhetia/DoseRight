import React from 'react'

export const HomeIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 4l9 5.75V19.5a1.5 1.5 0 01-1.5 1.5H4.5A1.5 1.5 0 013 19.5V9.75z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
  </svg>
)

export const PlusIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

export const ClockIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75a8.25 8.25 0 100 16.5 8.25 8.25 0 000-16.5z" />
  </svg>
)

export const BoxIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a1 1 0 00-.553-.894l-8-4a1 1 0 00-.894 0l-8 4A1 1 0 003 8v8a1 1 0 00.553.894l8 4a1 1 0 00.894 0l8-4A1 1 0 0021 16z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5l9 4" />
  </svg>
)

export const PillIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.12 3.88a5 5 0 00-7.07 0L3.88 13.05a5 5 0 007.07 7.07L20.12 10.94a5 5 0 000-7.06z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 8.5l7 7" />
  </svg>
)

export const EditIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L8.25 18.463 4 19l.537-4.25 12.325-11.263z" />
  </svg>
)

export const TrashIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5-6v6M4.5 6.75h15" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6.75V5.25a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25v1.5" />
  </svg>
)

export const UserIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a8.25 8.25 0 0115 0" />
  </svg>
)

export default null
