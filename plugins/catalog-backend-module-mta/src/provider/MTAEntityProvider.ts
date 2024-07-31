import { ComponentEntityV1alpha1 } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { Issuer, generators } from 'openid-client';
import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Logger } from 'winston';
import { SchedulerService } from '@backstage/backend-plugin-api';
import { MTAComponentEntity } from './mtaComponentEntity';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { locationSpecToLocationEntity } from '@backstage/plugin-catalog-node';
//
/**
 * Provides entities from fictional frobs service.
 */
export class MTAProvider implements EntityProvider {
  private connection?: EntityProviderConnection;
  private readonly config: Config;
  private readonly logger: Logger;
  private readonly scheduler: SchedulerService;

  static newProvider(
    config: Config,
    logger: Logger,
    scheduler: SchedulerService,
  ): MTAProvider {
    const p = new MTAProvider(config, logger, scheduler);
    // scheduler.scheduleTask({
    //   frequency: { seconds: 30 },
    //   timeout: { seconds: 30 },
    //   id: 'sync-mta-catalog',
    //   fn: p.run,
    // });

    return p;
  }
  /** [1] */
  constructor(config: Config, logger: Logger, scheduler: SchedulerService) {
    this.config = config;
    this.logger = logger;
    this.scheduler = scheduler;
    this.run = this.run.bind(this);
  }

  /** [2] */
  getProviderName(): string {
    return `MTAProvider`;
  }

  /** [3] */
  async connect(connection: EntityProviderConnection): Promise<void> {
    this.logger.info('connecting');
    this.connection = connection;
    this.scheduler.scheduleTask({
      frequency: { seconds: 5 },
      timeout: { seconds: 30 },
      id: 'sync-mta-catalog',
      fn: this.run,
    });
    await this.run();
  }

  /** [4] */
  async run(): Promise<void> {
    if (!this.connection) {
      throw new Error('Not initialized');
    }
    this.logger.info('here');

    const baseUrl = this.config.getString('mta.url');
    const baseUrlHub = `${baseUrl}/hub`;
    const baseUrlMta = `${baseUrl}`;
    const realm = this.config.getString('mta.providerAuth.realm');
    const clientID = this.config.getString('mta.providerAuth.clientID');
    const secret = this.config.getString('mta.providerAuth.secret');
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
      this.logger.info('unable to access hub');
    }

    console.log({
      code_verifier,
      code_challenge,
      tokenSet,
      baseURLAuth,
      baseUrlHub,
    });

    this.logger.info({
      code_verifier,
      code_challenge,
      tokenSet,
      baseURLAuth,
      baseUrlHub,
    });

    const getResponse = await fetch(`${baseUrlHub}/applications`, {
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
        Authorization: `Bearer ${tokenSet.access_token}`,
      },
      method: 'GET',
    });

    if (getResponse.status !== 200) {
      this.logger.info(
        `unable to call hub ${getResponse.status} message ${JSON.stringify(
          await getResponse.text(),
        )}`,
      );
      return;
    }
    const j = await getResponse.json();
    if (!Array.isArray(j)) {
      this.logger.info('expecting array of applications');
      return;
    }

    this.logger.info(`status: ${getResponse.status} json ${JSON.stringify(j)}`);
    await this.connection
      .applyMutation({
        type: 'full',
        entities: j.map(application => {
          const name = application.name.replace(/ /g, '-');
          const encodedAppName = encodeURIComponent(
            JSON.stringify(application.name),
          ); // Ensure the application name is URI-encoded
          const issuesUrl = `${baseUrlMta}/issues?i%3Afilters=%7B%22application.name%22%3A%5B${encodedAppName}%5D%7D&i%3AitemsPerPage=10&i%3ApageNumber=1&i%3AsortColumn=description&i%3AsortDirection=asc`;

          return {
            key: application.id,
            locationKey: this.getProviderName(),
            entity: {
              apiVersion: 'backstage.io/v1alpha1',
              kind: 'Component',
              metadata: {
                annotations: {
                  'backstage.io/managed-by-location': `url:${baseUrlMta}/application/${application.id}`,
                  'backstage.io/managed-by-origin-location': `url:${baseUrlMta}/application/${application.id}`,
                  'issues-url': `${issuesUrl}`,
                },
                name: name,
                id: application.id,
                namespace: 'default',
                application: application,
              },
              spec: {
                type: 'service',
                lifecycle: 'experimental',
                owner: 'unknown',
              },
            },
          };
        }),
      })
      .then(() => {
        console.log('REFRESHING');
        this.logger.info('refreshing');
        this.connection?.refresh({
          keys: j.map(application => application.id),
        });
      })
      .catch(e => {
        this.logger.info(`error applying mutation ${e}`);
      });
  }
}
