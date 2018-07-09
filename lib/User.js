const Chance = require('chance');
const AWS = require('aws-sdk');

const chance = new Chance();

const getDefaultAttributes = () => ({
  email: chance.email({ domain: 'mos-test.com' }),
  firstName: chance.first(),
  lastName: chance.last(),
  temporaryPassword: `!1aA${chance.string({ length: 8 })}`,
  password: `!1aA${chance.string({ length: 8 })}`,
});

const getCognitoConfig = (config = {}) => {
  // us-west-2
  const region = config.region || process.env.AWS_REGION;
  // us-west-2:aaaaaa-aaaaaa-aaaa...
  const identityPoolId = config.identityPoolId || process.env.AWS_IDENTITY_POOL_ID;
  // us-west-2_asd123asd
  const userPoolId = config.userPoolId || process.env.AWS_POOL_ID;
  // 76465grdt34tgr34
  const clientId = config.clientId || process.env.AWS_CLIENT_ID;
  const userPoolLogin = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  return {
    region,
    userPoolId,
    clientId,
    identityPoolId,
    userPoolLogin
  };
};

class User {
  constructor(attributes = {}, config = {}) {
    this.attributes = Object.assign(getDefaultAttributes(), attributes);
    this.config = getCognitoConfig(config);
    this.cognito = new AWS.CognitoIdentityServiceProvider({ region: this.config.region });
    this.cognitoIdentity = new AWS.CognitoIdentity({ region: this.config.region });
  }


  authenticatePromise() {
    const adminCreateUserReq = {
      UserPoolId: this.config.userPoolId,
      Username: this.attributes.email,
      MessageAction: 'SUPPRESS',
      TemporaryPassword: this.attributes.temporaryPassword,
      UserAttributes: [
        { Name: 'custom:firstName', Value: this.attributes.firstName },
        { Name: 'custom:lastName', Value: this.attributes.lastName },
        { Name: 'email', Value: this.attributes.email }
      ],
    };
    return this.cognito.adminCreateUser(adminCreateUserReq).promise()
      .then((data) => {
        this.cognitoUser = data.User;
        const adminInitiateAuthReq = {
          AuthFlow: 'ADMIN_NO_SRP_AUTH',
          UserPoolId: this.config.userPoolId,
          ClientId: this.config.clientId,
          AuthParameters: {
            USERNAME: this.attributes.email,
            PASSWORD: this.attributes.temporaryPassword,
          }
        };
        return this.cognito.adminInitiateAuth(adminInitiateAuthReq).promise();
      })
      .then((data) => {
        const adminRespondToAuthChallengeReq = {
          UserPoolId: this.config.userPoolId,
          ClientId: this.config.clientId,
          ChallengeName: data.ChallengeName,
          Session: data.Session,
          ChallengeResponses: {
            USERNAME: this.attributes.email,
            NEW_PASSWORD: this.attributes.password,
          },
        };
        return this.cognito.adminRespondToAuthChallenge(adminRespondToAuthChallengeReq).promise();
      })
      .then((data) => {
        this.cognitoUserToken = data.AuthenticationResult;
        const getIdReq = {
          IdentityPoolId: this.config.identityPoolId,
          Logins: {},
        };
        getIdReq.Logins[this.config.userPoolLogin] = this.cognitoUserToken.IdToken;
        return this.cognitoIdentity.getId(getIdReq).promise();
      })
      .then((data) => {
        const getCredentialsForIdentityReq = Object.assign(data, { Logins: {} });
        getCredentialsForIdentityReq
          .Logins[this.config.userPoolLogin] = this.cognitoUserToken.IdToken;
        return this.cognitoIdentity
          .getCredentialsForIdentity(getCredentialsForIdentityReq).promise();
      })
      .then((data) => {
        this.cognitoIdentityId = data.IdentityId;
        this.credentials = {
          accessKeyId: data.Credentials.AccessKeyId,
          secretAccessKey: data.Credentials.SecretKey,
          sessionToken: data.Credentials.SessionToken,
        };
        return this.credentials;
      });
  }

  getCognitoUserPromise() {
    const adminGetUserReq = {
      UserPoolId: this.config.userPoolId,
      Username: this.cognitoUser.Username,
    };
    return this.cognito.adminGetUser(adminGetUserReq).promise();
  }

  describeCognitoIdentityPromise() {
    const describeIdentityReq = { IdentityId: this.cognitoIdentityId };
    return this.cognitoIdentity.describeIdentity(describeIdentityReq).promise();
  }

  deleteUserFromCognitoPromises() {
    const adminDeleteUserReq = {
      UserPoolId: this.config.userPoolId,
      Username: this.cognitoUser.Username,
    };
    const deleteIdentitiesReq = {
      IdentityIdsToDelete: [this.cognitoIdentityId],
    };
    return [
      this.cognito.adminDeleteUser(adminDeleteUserReq).promise(),
      this.cognitoIdentity.deleteIdentities(deleteIdentitiesReq).promise(),
    ];
  }
}
module.exports = User;
