import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { defaultLocale, getLocaleFromHeaders, type Locale } from '@/lib/i18n';

export default getRequestConfig(async () => {
  // Get locale from browser or use default
  let locale: Locale = defaultLocale;
  
  try {
    // Check localStorage preference in client-side
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('preferred-locale') as Locale;
      if (stored && ['en', 'vi'].includes(stored)) {
        locale = stored;
      }
    } else {
      // Server-side: get from headers
      const headersList = await headers();
      const acceptLanguage = headersList.get('accept-language');
      locale = getLocaleFromHeaders(acceptLanguage);
    }
  } catch (error) {
    // Fallback to default locale if any error occurs
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});