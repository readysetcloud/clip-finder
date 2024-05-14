const { AuthClient, CredentialProvider, ExpiresIn, GenerateDisposableToken } = require('@gomomento/sdk');
const { getSecret } = require('@aws-lambda-powertools/parameters/secrets');
let authClient;

exports.handler = async (state) => {
  if (!authClient) {
    const secret = await getSecret(process.env.SECRET_ID, { transform: 'json' });
    authClient = new AuthClient({ credentialProvider: CredentialProvider.fromString(secret.momento) });
  }

  const tokenScope = {
    permissions: [
      {
        role: 'subscribeonly',
        cache: process.env.CACHE_NAME,
        topic: state.url
      }
    ]
  };

  const token = await authClient.generateDisposableToken(tokenScope, ExpiresIn.minutes(15));
  if (token instanceof GenerateDisposableToken.Success) {
    return { token: token.token };
  }
  else {
    console.error(token.error);
    throw new Error('Error generating token');
  }
};
