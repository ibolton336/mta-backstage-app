import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { createMTAApplicatonAction } from './actions/mta/create-application';
import { analyzeMTAApplicatonsAction } from './actions/mta/analyze-application';
import { loggerToWinstonLogger } from '@backstage/backend-common';

export const mtaScaffolderModule = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'mta',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        discovery: coreServices.discovery,
        identity: coreServices.identity,
      },
      async init({ scaffolder, config, logger, discovery, identity }) {
        const createAction = await createMTAApplicatonAction({
          config: config,
          logger: loggerToWinstonLogger(logger),
          discovery,
          identity,
        });
        const analyzeAction = await analyzeMTAApplicatonsAction({
          config,
          logger: loggerToWinstonLogger(logger),
          discovery,
        });
        scaffolder.addActions(createAction, analyzeAction);
      },
    });
  },
});
