const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event, context) => {
  const userPoolId = process.env.USER_POOL_ID;
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = event.request.userAttributes.email;

  try {
    // If the user is the admin email, add them to the admin group
    if (userEmail === adminEmail) {
      await cognito.adminAddUserToGroup({
        UserPoolId: userPoolId,
        Username: event.userName,
        GroupName: 'admin'
      }).promise();
    }
    // If user has @amazon.com or @amazon.com.* email, add them to paid group
    else if (userEmail.match(/@amazon\.com(?:\.[a-z]{2,})?$/i)) {
      await cognito.adminAddUserToGroup({
        UserPoolId: userPoolId,
        Username: event.userName,
        GroupName: 'paid'
      }).promise();
    }
    // All other users go to free group
    else {
      await cognito.adminAddUserToGroup({
        UserPoolId: userPoolId,
        Username: event.userName,
        GroupName: 'free'
      }).promise();
    }

    return event;
  } catch (error) {
    console.error('Error adding user to group:', error);
    throw error;
  }
};