// utils/amplify-config.ts
import { Amplify } from 'aws-amplify';
import { config } from '@/config';

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        identityPoolId: config.aws.cognito.identityPoolId,
        userPoolId: config.aws.cognito.userPoolId,
        userPoolClientId: config.aws.cognito.userPoolClientId,
        loginWith: {
          oauth: {
            domain: config.aws.cognito.oauth.domain,
            scopes: config.aws.cognito.oauth.scopes,
            redirectSignIn: config.aws.cognito.oauth.redirectSignIn,
            redirectSignOut: config.aws.cognito.oauth.redirectSignOut,
            responseType: config.aws.cognito.oauth.responseType,
          },
        },
      },
    },
  });
}