const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event, context) => {
  const userPoolId = process.env.USER_POOL_ID;
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = event.request.userAttributes.email;

  try {
    console.log(`New user registered: ${userEmail}`);
    
    // For government system: Only assign admin role to designated admin email
    // All other users get NO automatic group assignment - must be manually assigned by admin
    if (userEmail === adminEmail) {
      await cognito.adminAddUserToGroup({
        UserPoolId: userPoolId,
        Username: event.userName,
        GroupName: 'admin'
      }).promise();
      console.log(`Admin role assigned to: ${userEmail}`);
    } else {
      // No automatic group assignment for government users
      // Admin must manually assign roles based on clearance level and job function
      console.log(`User ${userEmail} registered - awaiting manual role assignment by admin`);
    }

    return event;
  } catch (error) {
    console.error('Error in post-confirmation:', error);
    throw error;
  }
};