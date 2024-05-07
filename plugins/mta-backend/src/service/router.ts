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
  const realm = config.getString('mta.auth.realm');
  const clientID = config.getString('mta.auth.clientID');
  const secret = config.getString('mta.auth.secret');
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

  router.use(async (request, response, next) => {
    if (request.path.includes('/cb') || request.path.includes('/health')) {
      next();
      return;
    }
    const backstageID = await identity.getIdentity({ request });
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

    if (!accessToken && !refreshToken) {
      const authorizationURL = authClient.authorizationUrl({
        redirect_uri: u.toString(),
        code_challenge,
        code_challenge_method: 'S256',
      });
      response.statusCode = 401;
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

  router.get('/health', async (request, response) => {
    logger.info('PING!');
    response.json({ status: 'ok' });
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

  router.get('/testing', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.use(errorHandler());
  return router;
}
