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
        const taskgroupResponse = await createTaskgroup(defaultTaskgroup);
        taskgroupResponse.data.mode = {
          binary: false,
          withDeps: true,
          artifact: '',
        };
        taskgroupResponse.data.rules = {
          labels: {
            excluded: [],
            included: [
              'konveyor.io/target=eap8',
              'konveyor.io/target=cloud-readiness',
              'konveyor.io/target=quarkus',
            ],
          },
        };

        const response = await submitTaskgroup(taskgroupResponse);
        logger.info(`Taskgroup submitted: ${response.id}`);
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
