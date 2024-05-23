import { createServiceBuilder } from '@backstage/backend-common';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter, RouterOptions } from './router';
import { PluginDatabaseManager } from '@backstage/backend-common'; // Assuming the import for this
import { Config } from '@backstage/config'; // Assuming the import for config
import { IdentityApi } from '@backstage/plugin-auth-node'; // Assuming the import for IdentityApi
import { PluginCacheManager } from '@backstage/backend-common'; // Assuming the import for CacheManager

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
  // You might need to add fields for the database, config, identity, and cache if they are to be passed from here
  database: PluginDatabaseManager;
  config: Config;
  identity: IdentityApi;
  cache: PluginCacheManager;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const { logger, database, config, identity, cache, port, enableCors } =
    options;

  const childLogger = logger.child({ service: 'mta-backend' });
  childLogger.debug('Starting application server...');

  const routerOptions: RouterOptions = {
    logger: childLogger,
    database,
    config,
    identity,
    cache,
  };

  const router = await createRouter(routerOptions);

  let service = createServiceBuilder(module)
    .setPort(port)
    .addRouter('/mta', router);

  if (enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return service.start().catch(err => {
    childLogger.error(`Error starting server: ${err}`);
    process.exit(1);
  });
}

if (module.hot) {
  module.hot.accept();
}
