'use client';
import { useEffect, useRef } from 'react';
import { useLang } from '@/context/LangContext';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function GoogleMapsLoader() {
  const { langCode } = useLang();
  const isFirstLoad = useRef(true);
  const loadedLang = useRef('');

  useEffect(() => {
    // Skip if already loaded with this language
    if (loadedLang.current === langCode) return;

    const load = () => {
      // Only remove old script (not window.google) when language changes after first load
      const existing = document.querySelector('script[data-maps-lang]');
      if (existing) {
        existing.remove();
        // Only nuke google object if this is a language-change reload (not first load)
        if (!isFirstLoad.current) {
          delete (window as any).google;
        }
      }

      isFirstLoad.current = false;
      loadedLang.current = langCode;

      // Skip if google is already available with the same lang (page refresh case)
      if ((window as any).google && existing === null) {
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&language=${langCode}`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-maps-lang', langCode);
      document.head.appendChild(script);
    };

    load();
  }, [langCode]);

  return null;
}
