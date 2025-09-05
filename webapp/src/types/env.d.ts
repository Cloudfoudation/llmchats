// types/env.d.ts
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NEXT_PUBLIC_USER_POOL_ID: string;
            NEXT_PUBLIC_USER_POOL_CLIENT_ID: string;
            NEXT_PUBLIC_IDENTITY_POOL_ID: string;
            NEXT_PUBLIC_AWS_REGION: string;
            NEXT_PUBLIC_AWS_BEDROCK_REGION: string;
            NEXT_PUBLIC_COGNITO_DOMAIN: string;
            NEXT_PUBLIC_OAUTH_REDIRECT_SIGNIN: string;
            NEXT_PUBLIC_OAUTH_REDIRECT_SIGNOUT: string;
            NEXT_PUBLIC_CONVERSATIONS_TABLE: string;
            NEXT_PUBLIC_USER_SETTINGS_TABLE: string;
        }
    }
}

export { };