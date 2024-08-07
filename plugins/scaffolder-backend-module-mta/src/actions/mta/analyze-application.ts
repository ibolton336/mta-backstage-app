import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Issuer, generators } from 'openid-client';
import { CatalogClient } from '@backstage/catalog-client';

export async function analyzeMTAApplicatonsAction(opts) {
  const { config, logger, discovery } = opts;

  const catalogClient = new CatalogClient({
    discoveryApi: discovery,
  });

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
        required: ['selectedApp', 'selectedTargets'],
        properties: {
          selectedApp: {
            title: 'Name of the application',
            description:
              'Name will be the display name in MTA appliation, will be the name seen in the catalog',
            type: 'string',
          },
          selectedTargets: {
            title: 'Select Targets',
            description: 'Select the targets for the analysis',
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'eap8',
                'eap7',
                'cloud-readiness',
                'quarkus',
                'openjdk11',
                'openjdk17',
                'openjdk21',
                'openjdk',
                'linux',
                'jakarta-ee',
                'rhr',
                'jws6',
                'openliberty',
                'camel3',
                'camel4',
                'azure-appservice',
                'azure-aks',
              ],
            },
            uniqueItems: true,
          },
        },
      },
    },
    async handler(ctx) {
      console.log('input', ctx.input);
      // const createTaskGroupURL = `${baseURLHub}/task-groups`;

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

      const createTaskgroup = async (obj: Taskgroup) => {
        const response = await fetch(TASKGROUPS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenSet.access_token}`,
          },
          body: JSON.stringify(obj),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.info(
            `Unable to call hub, status: ${response.status}, message: ${errorText}`,
          );
          throw new Error(
            `HTTP error! status: ${response.status}, body: ${errorText}`,
          );
        }
        return await response.json();
      };

      const submitTaskgroup = async (obj: Taskgroup) => {
        const response = await fetch(`${TASKGROUPS}/${obj.id}/submit`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenSet.access_token}`,
          },
          body: JSON.stringify(obj),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.info(
            `Unable to call hub, status: ${response.status}, message: ${errorText}`,
          );
          throw new Error(
            `HTTP error! status: ${response.status}, body: ${errorText}`,
          );
        }
        // Return the status code to indicate success or no content
        logger.info(`Operation successful, status code: ${response.status}`);
        return {
          status: response.status,
          message: 'Submission successful',
        };
      };
      try {
        const [kindNamespace, name] = ctx.input.selectedApp.split('/');

        const [kind, namespace] = kindNamespace.split(':');

        console.log('app entity', kind, namespace, name);
        const entities = await catalogClient.getEntities({
          filter: {
            kind: kind,
            'metadata.namespace': namespace,
            'metadata.name': name,
          },
        });
        console.log('found entities', entities);

        // Check if entities were found
        if (entities.items.length === 0) {
          ctx.logger.error(`No entities found for ${ctx.input.selectedApp}`);
          return;
        }

        // Assume there's only one matching entity
        const matchingEntity = entities.items[0];

        const taskgroupResponse = await createTaskgroup(defaultTaskgroup);
        taskgroupResponse.tasks = [
          {
            name: `taskgroup.analyzer.${matchingEntity.metadata.name}`,
            data: {},
            application: {
              id: matchingEntity.metadata.id as number,
              name: matchingEntity.metadata.name,
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
            included: ctx.input.selectedTargets.map(
              (target: string) => `konveyor.io/target=${target}`,
            ),
          },
        };
        console.log('submitted taskgroup', taskgroupResponse);
        const response = await submitTaskgroup(taskgroupResponse);
        logger.info(
          `Taskgroup submitted. Status: ${response?.status ?? 'unknown'}`,
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.info(`Error: ${error}`);
      }
    },
  });
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
