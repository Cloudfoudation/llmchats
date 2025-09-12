'use client'

import { useEffect, useState } from 'react';
import localFont from "next/font/local";
import "./globals.css";
import "../styles/prosemirror.css";
import { NextIntlClientProvider } from 'next-intl';
import { AuthProvider } from '@/providers/AuthProvider';
import { ConversationProvider } from '@/providers/ConversationProvider';
import { ModalProvider } from '@/providers/ModalProvider';
import { SettingsProvider } from '@/providers/SettingsProvider'
import { SyncProvider } from '@/providers/SyncProvider'
import { AgentsProvider } from '@/providers/AgentsProvider';
import { KnowledgeBaseProvider } from '@/providers/KnowledgeBaseProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { registerServiceWorker } from '@/utils/serviceWorker';
import { PWAHandler } from '@/components/PWAHandler';
import { defaultLocale, type Locale } from '@/lib/i18n';

const geistSans = localFont({
    src: "./fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});

const geistMono = localFont({
    src: "./fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
    weight: "100 900",
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    useEffect(() => {
        registerServiceWorker();
    }, []);

    // Get current locale from localStorage or use default
    const getLocale = (): Locale => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('preferred-locale') as Locale;
            if (stored && ['en', 'vi'].includes(stored)) {
                return stored;
            }
        }
        return defaultLocale;
    };

    const locale = getLocale();

    // Load messages dynamically
    const [messages, setMessages] = useState<any>(null);

    useEffect(() => {
        const loadMessages = async () => {
            try {
                const msgs = await import(`../../messages/${locale}.json`);
                setMessages(msgs.default);
            } catch (error) {
                console.error('Failed to load messages:', error);
                const fallbackMsgs = await import(`../../messages/${defaultLocale}.json`);
                setMessages(fallbackMsgs.default);
            }
        };
        loadMessages();
    }, [locale]);

    if (!messages) {
        return (
            <html lang={locale} suppressHydrationWarning>
                <head>
                    <title>Loading...</title>
                </head>
                <body>
                    <div className="flex items-center justify-center h-screen">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
                    </div>
                </body>
            </html>
        );
    }

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <title>Bedrock Chat</title>
                <meta name="description" content="A production-ready chat application for AWS Bedrock" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <meta name="theme-color" content="#000000" />
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200`} suppressHydrationWarning>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
                        <SettingsProvider>
                            <AuthProvider>
                                <SyncProvider>
                                    <KnowledgeBaseProvider
                                        config={{
                                            autoRefreshInterval: 30000
                                        }}
                                    >
                                        <AgentsProvider>
                                            <ConversationProvider>
                                                <ModalProvider>
                                                    {children}
                                                    <PWAHandler />
                                                </ModalProvider>
                                            </ConversationProvider>
                                        </AgentsProvider>
                                    </KnowledgeBaseProvider>
                                </SyncProvider>
                            </AuthProvider>
                        </SettingsProvider>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}