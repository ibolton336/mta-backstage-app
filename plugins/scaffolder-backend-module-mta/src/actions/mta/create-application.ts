import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { coreServices } from '@backstage/backend-plugin-api';
import { Issuer, generators } from 'openid-client';

/**
 * Creates an `acme:example` Scaffolder action.
 *
 * @remarks
 * See {@link https://example.com} for more information.
 * @public
 */
export async function createMTAApplicatonAction(opts) {
  const { config, logger } = opts;
  const baseUrl = config.getString('mta.url');
  const baseURLHub = baseUrl + '/hub';
  const realm = config.getString('mta.providerAuth.realm');
  const clientID = config.getString('mta.providerAuth.clientID');
  const secret = config.getString('mta.providerAuth.secret');
  const baseURLAuth = baseUrl + '/auth/realms/' + realm;

  const mtaAuthIssuer = await Issuer.discover(baseURLAuth);
  const authClient = new mtaAuthIssuer.Client({
    client_id: clientID,
    client_secret: secret,
    response_types: ['code'],
  });

  const tokenSet = await authClient.grant({
    grant_type: 'client_credentials',
  });
  if (!tokenSet.access_token) {
    logger.error('Failed to obtain access token from auth server.');
    throw new Error('Unable to access hub due to authentication failure.');
  }

  return createTemplateAction<{
    name: string;
    url: string;
    branch: string;
    rootPath: string;
  }>({
    id: 'mta:createApplication',
    description: 'Create application in MTA',
    schema: {
      input: {
        type: 'object',
        required: ['name', 'url', 'branch', 'rootPath'],
        properties: {
          name: {
            title: 'Name of the application',
            description:
              'Name will be the display name in MTA application, seen in the catalog',
            type: 'string',
          },
          url: {
            title: 'Repository URL',
            description: 'URL to the repository',
            type: 'string',
          },
          branch: {
            title: 'Branch',
            description: 'Branch to use',
            type: 'string',
          },
          rootPath: {
            title: 'Root Path',
            description: 'Root Path to use',
            type: 'string',
          },
        },
      },
    },
    async handler(ctx) {
      const { name, url, branch, rootPath } = ctx.input;
      logger.info(
        `Creating application with: ${name}, ${url}, ${branch}, ${rootPath}`,
      );

      const repository = url
        ? {
            kind: 'git',
            url: url.trim(),
            branch: branch.trim(),
            path: rootPath.trim(),
          }
        : undefined;
      const body = JSON.stringify({ name, repository });

      try {
        const response = await fetch(`${baseURLHub}/applications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenSet.access_token}`,
          },
          body,
        });

        if (!response.ok) {
          const responseText = await response.text();
          logger.error(`HTTP Error ${response.status}: ${responseText}`);
          throw new Error(
            `Failed to create application. Server responded with status: ${response.status}`,
          );
        }

        const responseData = await response.json();
        logger.info(
          `Application created successfully: ${JSON.stringify(responseData)}`,
        );
        return responseData;
      } catch (error) {
        logger.error(`Error in creating application: ${error.message}`);
        throw error;
      }
    },
  });
}
