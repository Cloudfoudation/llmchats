// src/app/metadata.ts
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Bedrock Chat",
    description: "A production-ready chat application for AWS Bedrock",
    applicationName: "Bedrock Chat",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Bedrock Chat",
    },
    formatDetection: {
        telephone: false,
    },
    manifest: "/manifest.json",
    themeColor: "#000000",
    viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
    icons: {
        apple: "/icons/icon-192x192.png",
    }
};