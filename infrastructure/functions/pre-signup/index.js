// Pre-signup Lambda trigger for auto-confirmation in development environment
const AWS = require('aws-sdk');

exports.handler = async (event, context) => {
  console.log('Pre-signup trigger event:', JSON.stringify(event, null, 2));
  
  const environment = process.env.ENVIRONMENT || 'dev';
  const userEmail = event.request.userAttributes.email;
  
  console.log(`Environment: ${environment}, User email: ${userEmail}`);
  
  // Auto-confirm users in development environment
  if (environment === 'dev' || environment === 'development') {
    console.log('Development environment detected - auto-confirming user');
    
    // Automatically confirm the user
    event.response.autoConfirmUser = true;
    
    // Auto-verify email if present
    if (event.request.userAttributes.hasOwnProperty("email")) {
      event.response.autoVerifyEmail = true;
      console.log('Auto-verifying email for user');
    }
    
    // Auto-verify phone if present
    if (event.request.userAttributes.hasOwnProperty("phone_number")) {
      event.response.autoVerifyPhone = true;
      console.log('Auto-verifying phone for user');
    }
    
    console.log('User auto-confirmed for development environment');
  } else {
    console.log('Production environment - normal verification flow');
  }
  
  return event;
};