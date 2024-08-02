import { errorHandler } from '@backstage/backend-common';
import express, { Router } from 'express';
import {
  PluginCacheManager,
  PluginDatabaseManager,
} from '@backstage/backend-common';
import { Config } from '@backstage/config';
import { IdentityApi } from '@backstage/plugin-auth-node';
import { Logger } from 'winston';
import { Issuer, generators } from 'openid-client';
import { DataBaseEntityApplicationStorage } from '../database/storage';
import { isTokenExpired } from '../utils';

export interface RouterOptions {
  logger: Logger;
  database: PluginDatabaseManager;
  config: Config;
  identity: IdentityApi;
  cache: PluginCacheManager;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, database, identity, cache } = options;

  const dbClient = await database.getClient();
  const entityApplicationStorage =
    await DataBaseEntityApplicationStorage.create(dbClient, logger);
  const cacheClient = await cache.getClient();
  const mtaToken = config.getOptional('mta.token');
  const frontEndBaseURL = config.getString('app.baseUrl');
  const backstageBaseURL = config.getString('backend.baseUrl');
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

  const router = Router();
  router.use(express.json());

  router.get('/cb/*', async (request, response) => {
    logger.info('PONG!');
    const user: any = request.params[0] as string;
    logger.info(`user in callback: ${user}`);
    const continueTo = request.query.continueTo;
    const u = new URL(`${backstageBaseURL}/api/mta/cb/${user}`);
    if (continueTo) {
      u.searchParams.set('continueTo', continueTo.toString());
    }
    logger.info(`in callback: ${u.toString()}`);
    const params = authClient.callbackParams(request);
    const tokenSet = await authClient.callback(u.toString(), params, {
      code_verifier,
    });
    if (!tokenSet.access_token || !tokenSet.refresh_token) {
      response.status(401);
      response.json({});
      return;
    }
    cacheClient.set(user, tokenSet.access_token, {
      ttl: tokenSet.expires_in ?? 60 * 1000,
    });
    entityApplicationStorage.saveRefreshTokenForUser(
      user,
      tokenSet.refresh_token,
    );
    response.redirect(continueTo?.toString() ?? frontEndBaseURL);
  });
  router.use((req, res, next) => {
    console.log(
      `Rileys request Incoming request NOW: ${req.method} ${req.path}`,
    );
    next();
  });

  router.use(async (request, response, next) => {
    logger.info(`path: ${request.path}`);
    if (request.path.includes('/cb') || request.path.includes('/health')) {
      console.log('includes cb then next');
      next();
      return;
    }
    const backstageID = await identity.getIdentity({ request });
    logger.info(
      `backstageID id for userEntityRef: ${backstageID?.identity.userEntityRef}`,
    );
    logger.info({
      backstageBaseURL,
      frontEndBaseURL,
      requestHeaders: request.headers,
      referer: request.headers.referer,
    });
    const id = backstageID?.identity.userEntityRef ?? 'undefined';
    const u = new URL(`${backstageBaseURL}/api/mta/cb/${id}`);
    const org = request.headers.referer;
    logger.info(`here2: ${org}`);
    u.searchParams.set(
      'continueTo',
      request.headers.referer ?? frontEndBaseURL,
    );
    logger.info(`here: ${u.toString()}`);
    let accessToken = await cacheClient.get(String(id));

    const refreshToken = await entityApplicationStorage.getRefreshTokenForUser(
      String(id),
    );

    if (refreshToken) {
      const expired = isTokenExpired(refreshToken.toString());
      if (expired) {
        console.log('Refresh token has expired. Redirecting to login.');
        const authorizationURL = authClient.authorizationUrl({
          redirect_uri: u.toString(),
          code_challenge,
          code_challenge_method: 'S256',
        });
        response.statusCode = 401;
        response.json({ loginURL: authorizationURL });
        return;
      }
    }

    console.log({
      backstageBaseURL,
      frontEndBaseURL,
      requestHeaders: request.headers,
      referer: request.headers.referer,
      accessToken,
      refreshToken,
      u: u.toString(),
      id,
    });
    if (!accessToken && !refreshToken) {
      console.log('u.toString', u.toString());
      console.log('u redirect uri!', u);
      const authorizationURL = authClient.authorizationUrl({
        redirect_uri: u.toString(),
        // redirect_uri: 'http://localhost:7007/api/mta/cb/user:development/guest',
        code_challenge,
        code_challenge_method: 'S256',
      });
      response.statusCode = 401;
      logger.info(`no token found`, { authorizationURL });
      response.json({ loginURL: authorizationURL });
      return;
    }
    if (!accessToken && refreshToken) {
      const tokenSet = await authClient.refresh(String(refreshToken));
      if (!tokenSet || !tokenSet.access_token) {
        const authorizationURL = authClient.authorizationUrl({
          redirect_uri: u.toString(),
          code_challenge,
          code_challenge_method: 'S256',
        });
        response.statusCode = 401;
        response.json({ loginURL: authorizationURL });
        return;
      }
      logger.info(`refreshed token`);
      accessToken = String(tokenSet.access_token);
      cacheClient.set(String(id), String(tokenSet.access_token), {
        ttl: tokenSet.expires_in ?? 60 * 1000,
      });
      if (tokenSet.refresh_token && tokenSet.refresh_token !== refreshToken) {
        entityApplicationStorage.saveRefreshTokenForUser(
          String(id),
          tokenSet.refresh_token,
        );
      }
    }
    response.locals.accessToken = accessToken;
    next();
  });

  router.get('/cb/:username', async (request, response) => {
    logger.info('PONG!');
    const user = request.params.username;
    logger.info(`user in callback: ${user}`);
    const continueTo = request.query.continueTo;
    const u = new URL(`${backstageBaseURL}/api/mta/cb/${user}`);
    if (continueTo) {
      u.searchParams.set('continueTo', continueTo.toString());
    }
    logger.info(`in callback: ${u.toString()}`);
    const params = authClient.callbackParams(request);
    const tokenSet = await authClient.callback(u.toString(), params, {
      code_verifier,
    });
    if (!tokenSet.access_token || !tokenSet.refresh_token) {
      response.status(401);
      response.json({});
      return;
    }
    cacheClient.set(user, tokenSet.access_token, {
      ttl: tokenSet.expires_in ?? 60 * 1000,
    });
    entityApplicationStorage.saveRefreshTokenForUser(
      user,
      tokenSet.refresh_token,
    );
    response.redirect(continueTo?.toString() ?? frontEndBaseURL);
  });

  router.get('/health', async (request, response) => {
    logger.info('PING!');
    response.json({ status: 'ok' });
  });

  router.get('/testing', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/targets', async (request, response) => {
    const getResponse = fetch(baseURLHub + '/targets', {
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
        Authorization: 'Bearer ' + response.locals.accessToken,
      },
      method: 'GET',
    });

    const status = await (await getResponse).status;
    if (status !== 200) {
      response.status(status);
      response.json({ status: status });
      return;
    }
    const j = await (await getResponse).json();
    response.json(j);
  });

  router.get('/applications', async (request, response) => {
    const getResponse = fetch(baseURLHub + '/applications', {
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
        Authorization: 'Bearer ' + response.locals.accessToken,
      },
      method: 'GET',
    });

    const status = await (await getResponse).status;
    if (status != 200) {
      response.status(status);
      response.json({ status: status });
      return;
    }
    const j = await (await getResponse).json();
    response.json(j);
  });

  router.get('/application/entity/:id', async (request, response) => {
    const applicatonID =
      await entityApplicationStorage.getApplicationIDForEntity(
        request.params.id,
      );
    // const entities = await entityApplicationStorage.getAllEntities();
    if (!applicatonID) {
      response.status(404);
      response.json({ message: 'no application mapped' });
      return;
    }

    logger.info('found application: ' + applicatonID);

    const getResponse = fetch(baseURLHub + '/applications/' + applicatonID, {
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
        Authorization: 'Bearer ' + response.locals.accessToken,
      },
      method: 'GET',
    });

    const status = await (await getResponse).status;
    if (status != 200) {
      response.status(status);
      response.json({ status: status });
      return;
    }
    const j = await (await getResponse).json();
    response.json(j);
  });

  router.get('/entities', async (request, response) => {
    try {
      const entities = await entityApplicationStorage.getAllEntities();

      if (entities.length === 0) {
        response.status(404).json({ message: 'No entities found' });
        return;
      }

      logger.info(`Retrieved all entities: ${entities.length} entries found.`);

      response.json(entities);
    } catch (error) {
      logger.error('Failed to fetch entities:', error);

      response.status(500).json({ error: 'Failed to fetch entities' });
    }
  });

  router.post('/application/entity', async (request, response) => {
    logger.info(
      'Received request for /application/entity with body:',
      request.body,
    );
    const { entityID, applicationID } = request.body;

    try {
      logger.info('Attempting to save:', entityID, applicationID);
      const res = await entityApplicationStorage.saveApplicationIDForEntity(
        entityID,
        applicationID,
      );
      if (!res) {
        logger.error('Failed to save application ID for entity');
        response.status(500).json({ error: 'Failed to save data' });
        return;
      }
      logger.info('Successfully saved:', entityID, applicationID);
      response.status(201).json({ entityID, applicationID });
    } catch (error) {
      logger.error('Error in /application/entity:', error);
      response.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.get('/issues/:id', async (request, response) => {
    const getResponse = fetch(
      baseURLHub + '/applications/' + request.params.id + '/analysis/issues',
      {
        credentials: 'include',
        headers: {
          Accept: 'application/json, text/plain, */*',
          Authorization: 'Bearer ' + response.locals.accessToken,
        },
        method: 'GET',
      },
    );

    const status = await (await getResponse).status;
    if (status !== 200) {
      logger.error('resposne does not make sense %s', getResponse);
      response.status(status);
      response.json({ status: status });
      return;
    }
    const j = await (await getResponse).json();
    response.json(j);
  });

  router.post(
    '/analyze-application/:applicationId',
    async (request, response) => {
      const applicationId = request.params.applicationId;
      const analysisOptions = request.body; // Assuming all other required options are passed in the body
      const { application, targetList, type } = analysisOptions;

      logger.info(
        'Received request to analyze application:',
        applicationId,
        'with options:',
        analysisOptions,
      );

      const TASKGROUPS = `${baseURLHub}/taskgroups`;
      // Step 1: Create a task group

      const defaultTaskData: TaskData = {
        tagger: {
          enabled: true,
        },
        verbosity: 0,
        mode: {
          binary: false,
          withDeps: false,
          artifact: '',
        },
        targets: [],
        sources: [],
        scope: {
          withKnownLibs: false,
          packages: {
            included: [],
            excluded: [],
          },
        },
      };

      const defaultTaskgroup = {
        name: `taskgroup.analyzer`,
        data: {
          ...defaultTaskData,
        },
        tasks: [],
        kind: 'analyzer',
      };

      // const createTaskgroup = async (obj: Taskgroup) => {
      //   const createTaskgroupResponse = await fetch(TASKGROUPS, {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       Authorization: `Bearer ${response.locals.access_token}`,
      //     },
      //     body: JSON.stringify(obj),
      //   });

      //   if (!createTaskgroupResponse.ok) {
      //     const errorText = await createTaskgroupResponse.text();
      //     logger.info(
      //       `Unable to call hub, status: ${response.status}, message: ${errorText}`,
      //     );
      //     throw new Error(
      //       `HTTP error! status: ${response.status}, body: ${errorText}`,
      //     );
      //   }
      //   return await createTaskgroupResponse.json();
      // };
      const createTaskgroup = async (obj: Taskgroup) => {
        console.log('obj', obj);
        const createTaskgroupResponse = await fetch(TASKGROUPS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*',

            Authorization: `Bearer ${response.locals.accessToken}`,
          },
          body: JSON.stringify(obj),
        });

        // Correct use of response status from the fetch call
        if (!createTaskgroupResponse.ok) {
          const contentType =
            createTaskgroupResponse.headers.get('content-type');
          let errorText;

          // Check if the response is text/html which might indicate a redirection or an error page
          if (contentType && contentType.includes('text/html')) {
            errorText =
              'Received HTML response instead of JSON. Possible authorization or redirect issue.';
          } else {
            errorText = await createTaskgroupResponse.text();
          }

          logger.error(
            `Unable to call hub, status: ${createTaskgroupResponse.status}, message: ${errorText}`,
          );
          throw new Error(
            `HTTP error! status: ${createTaskgroupResponse.status}, body: ${errorText}`,
          );
        }

        try {
          return await createTaskgroupResponse.json();
        } catch (e) {
          throw new Error('Failed to parse JSON response.');
        }
      };

      const submitTaskgroup = async (obj: Taskgroup) => {
        const submitTaskgroupResponse = await fetch(
          `${TASKGROUPS}/${obj.id}/submit`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json, text/plain, */*',
              Authorization: `Bearer ${response.locals.accessToken}`,
            },
            body: JSON.stringify(obj),
          },
        );

        if (!submitTaskgroupResponse.ok) {
          const errorText = await submitTaskgroupResponse.text();
          logger.info(
            `Unable to call hub, status: ${submitTaskgroupResponse.status}, message: ${errorText}`,
          );
          throw new Error(
            `HTTP error! status: ${submitTaskgroupResponse.status}, body: ${errorText}`,
          );
        }
        // Return the status code to indicate success or no content
        logger.info(
          `Operation successful, status code: ${submitTaskgroupResponse.status}`,
        );
        return {
          status: submitTaskgroupResponse.status,
          message: 'Submission successful',
        };
      };

      try {
        const taskgroupResponse = await createTaskgroup(defaultTaskgroup);
        taskgroupResponse.tasks = [
          {
            name: `taskgroup.analyzer.${application.name}`,
            data: {},
            application: {
              id: application.id as number,
              name: application.name,
            },
          },
        ];
        taskgroupResponse.data.mode = {
          binary: false,
          withDeps: true,
          artifact: '',
        };
        taskgroupResponse.data.rules = {
          labels: {
            excluded: [],
            // included: [
            //   'konveyor.io/target=eap8',
            //   'konveyor.io/target=cloud-readiness',
            //   'konveyor.io/target=quarkus',
            // ],
            included: targetList,
          },
        };
        console.log('submitted taskgroup', taskgroupResponse);
        const submitTaskgroupResponse = await submitTaskgroup(
          taskgroupResponse,
        );
        logger.info(
          `Taskgroup submitted. Status: ${response?.status ?? 'unknown'}`,
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(
          'Error during analysis of application:',
          applicationId,
          error,
        );
        response
          .status(500)
          .json({ error: 'Internal Server Error', details: error.message });
      }
    },
  );

  router.use(errorHandler());
  return router;
}

export interface Taskgroup {
  id?: number;
  name: string;
  kind?: string;
  addon?: string;
  data: TaskData;
  tasks: TaskgroupTask[];
}
export interface TaskData {
  tagger: {
    enabled: boolean;
  };
  verbosity: number;
  mode: {
    binary: boolean;
    withDeps: boolean;
    artifact: string;
    csv?: boolean;
  };
  targets?: string[];
  sources?: string[];
  scope: {
    withKnownLibs: boolean;
    packages: {
      included: string[];
      excluded: string[];
    };
  };
  rules?: {
    path: string;
    tags: {
      excluded: string[];
    };
    repository?: Repository;
    identity?: Ref;
    labels: {
      included: string[];
      excluded: string[];
    };
  };
}

export interface TaskgroupTask {
  name: string;
  data: any;
  application: Ref;
}

export interface Ref {
  id: number;
  name: string;
}

export interface Repository {
  kind?: string;
  branch?: string;
  path?: string;
  url?: string;
}
