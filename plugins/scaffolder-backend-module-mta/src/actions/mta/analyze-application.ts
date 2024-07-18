import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Issuer, generators } from 'openid-client';

export async function analyzeMTAApplicatonsAction(opts) {
  const { config, logger } = opts;
  const baseUrl = config.getString('mta.url');
  const baseURLHub = `${baseUrl}/hub`;
  const realm = config.getString('mta.providerAuth.realm');
  const clientID = config.getString('mta.providerAuth.clientID');
  const secret = config.getString('mta.providerAuth.secret');

  const baseURLAuth = `${baseUrl}/auth/realms/${realm}`;
  const mtaAuthIssuer = await Issuer.discover(baseURLAuth);

  const authClient = new mtaAuthIssuer.Client({
    client_id: clientID,
    client_secret: secret,
    response_types: ['code'],
  });
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);

  const tokenSet = await authClient.grant({
    grant_type: 'client_credentials',
  });

  if (!tokenSet.access_token) {
    logger.info('unable to access hub');
  }

  return createTemplateAction<{}>({
    id: 'mta:analyzeApplication',
    description: 'Analyze an MTA application',
    schema: {
      input: {
        type: 'object',
        required: ['selectedApp'],
        properties: {
          selectedApp: {
            title: 'Name of the application',
            description:
              'Name will be the display name in MTA appliation, will be the name seen in the catalog',
            type: 'string',
          },
        },
      },
    },
    async handler(ctx) {
      console.log('Received input:', ctx.input); // Log the received inputs

      ctx.logger.info(
        `Running example template with parameters: ${ctx.input.selectedApp} -- ${ctx.input}`,
      );
      const fetchURL = `${baseURLHub}/applications`;
      const authHeader = `Bearer ${tokenSet.access_token}`;

      const getResponse = await fetch(fetchURL, {
        credentials: 'include',
        headers: {
          Accept: 'application/json, text/plain, */*',
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ name: ctx.input.selectedApp }),
      });
      if (getResponse.status != 200) {
        ctx.logger.info(
          'unable to call hub ' +
            getResponse.status +
            ' message ' +
            JSON.stringify(getResponse.text()),
        );
        return;
      }
      const j = await getResponse.json();
      if (!Array.isArray(j)) {
        ctx.logger.info('expecting array of applications');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  });
}
