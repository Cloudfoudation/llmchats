// config/index.ts
import { AppConfig } from '@/types/environment';

const getConfig = (): AppConfig => {
    const missingEnvVars = [];

    if (!process.env.NEXT_PUBLIC_USER_POOL_ID) {
        missingEnvVars.push('NEXT_PUBLIC_USER_POOL_ID');
    }

    if (!process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID) {
        missingEnvVars.push('NEXT_PUBLIC_USER_POOL_CLIENT_ID');
    }

    if (!process.env.NEXT_PUBLIC_IDENTITY_POOL_ID) {
        missingEnvVars.push('NEXT_PUBLIC_IDENTITY_POOL_ID');
    }

    if (!process.env.NEXT_PUBLIC_AWS_REGION) {
        missingEnvVars.push('NEXT_PUBLIC_AWS_REGION');
    }

    if (!process.env.NEXT_PUBLIC_COGNITO_DOMAIN) {
        missingEnvVars.push('NEXT_PUBLIC_COGNITO_DOMAIN');
    }

    if (!process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGNIN) {
        missingEnvVars.push('NEXT_PUBLIC_OAUTH_REDIRECT_SIGNIN');
    }

    if (!process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGNOUT) {
        missingEnvVars.push('NEXT_PUBLIC_OAUTH_REDIRECT_SIGNOUT');
    }

    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    return {
        aws: {
            cognito: {
                userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
                userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
                identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID,
                region: process.env.NEXT_PUBLIC_AWS_REGION,
                oauth: {
                    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
                    scopes: ['email', 'profile', 'openid'] as const,
                    redirectSignIn: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGNIN.split(","),
                    redirectSignOut: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGNOUT.split(","),
                    responseType: 'code' as const,
                },
            },
        },
    } as const;
};

export const config = getConfig();