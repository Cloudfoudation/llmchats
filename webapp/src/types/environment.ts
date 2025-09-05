// types/environment.ts
export interface OAuthConfig {
    readonly domain: string;
    readonly scopes: string[];
    readonly redirectSignIn: string[];
    readonly redirectSignOut: string[];
    readonly responseType: 'code' | 'token';
}

export interface CognitoConfig {
    readonly userPoolId: string;
    readonly userPoolClientId: string;
    readonly identityPoolId: string;
    readonly region: string;
    readonly oauth: OAuthConfig;
}

export interface AwsConfig {
    readonly cognito: CognitoConfig;
}

export interface AppConfig {
    readonly aws: AwsConfig;
}