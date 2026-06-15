'use client';
import { LangProvider } from '@/context/LangContext';
import GoogleMapsLoader from './GoogleMapsLoader';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <GoogleMapsLoader />
      {children}
    </LangProvider>
  );
}
