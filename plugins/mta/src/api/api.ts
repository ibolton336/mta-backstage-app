import {
  DiscoveryApi,
  IdentityApi,
  createApiRef,
} from '@backstage/core-plugin-api';
export interface Metadata {
  target: string;
  source?: string;
  otherLabels?: string[];
}
export interface Rule {
  name: string;
  metadata?: Metadata;
  labels?: string[];
  file?: {
    id: number;
  };
}

export type Tags = {
  name: string;
  source: SourceBuffer;
  virutal: boolean;
};

export type Ref = {
  id: number;
  name: string;
};
export interface ITypeOptions {
  key: string;
  value: string;
}

export interface RulesetImage {
  id: number;
  name?: string;
}

export enum RulesetKind {
  CATEGORY = 'category',
}
export interface Repository {
  kind?: string;
  branch?: string;
  path?: string;
  url?: string;
}
export interface Ruleset {
  id?: number;
  kind?: RulesetKind;
  name?: string;
  description?: string;
  rules: Rule[];
  repository?: Repository;
  identity?: Ref;
}
export interface TargetLabel {
  name: string;
  label: string;
}
export interface Target {
  id: number;
  name: string;
  description?: string;
  choice?: boolean;
  custom?: boolean;
  labels?: TargetLabel[];
  image?: RulesetImage;
  ruleset: Ruleset;
  provider?: string;
}

export type Application = {
  id: string;
  name: string;
  description: string;
  buisnessService?: Ref;
  assessed: boolean;
  owner?: Ref;
  tags?: Tags[];
  effort?: number;
  risk?: number;
  comments?: string;
  binary?: string;
  bucket?: {
    id: string;
    name: string;
  };
};
export interface MTAApi {
  getApplications(): Promise<Application[] | URL>;
  getApplication(entityID: string): Promise<Application | URL | null>;
  getTargets(): Promise<Target[] | URL>;
  getAllEntities(): Promise<any[]>;
  analyzeMTAApplications(
    applicationId: string,
    analysisOptions: any,
  ): Promise<any | URL>;
}

export const mtaApiRef = createApiRef<MTAApi>({
  id: 'plugin.mta',
});

export class DefaultMtaApi implements MTAApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly identityApi: IdentityApi;

  async getAllEntities(): Promise<any[]> {
    const url = await this.discoveryApi.getBaseUrl('mta');
    const { token: idToken } = await this.identityApi.getCredentials();

    const response = await fetch(`${url}/entities`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
      referrerPolicy: 'no-referrer-when-downgrade',
    });

    if (response.status === 401) {
      const j = await response.json();
      throw new Error(j.loginURL);
      // return new URL(j.loginURL);
    }

    if (!response.ok) {
      const message = `Request failed with status ${
        response.status
      }: ${await response.text()}`;
      throw new Error(message);
    }

    return await response.json();
  }

  async getTargets(): Promise<Target[] | URL> {
    const url = await this.discoveryApi.getBaseUrl('mta');
    const { token: idToken } = await this.identityApi.getCredentials();

    const response = await fetch(`${url}/targets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
      referrerPolicy: 'no-referrer-when-downgrade',
      redirect: 'error',
    });

    if (response.status === 401) {
      const j = await response.json();
      return new URL(j.loginURL);
    }

    if (!response.ok) {
      const message = `Request failed with status ${
        response.status
      }: ${await response.text()}`;
      throw new Error(message);
    }

    return await response.json();
  }
  async getApplications(): Promise<Application[] | URL> {
    const url = await this.discoveryApi.getBaseUrl('mta');
    const { token: idToken } = await this.identityApi.getCredentials();

    const response = await fetch(`${url}/applications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
      referrerPolicy: 'no-referrer-when-downgrade',
      redirect: 'error',
    });

    if (response.status === 401) {
      const j = await response.json();
      return new URL(j.loginURL); // Redirect for login
    }

    if (!response.ok) {
      const message = `Request failed with status ${
        response.status
      }: ${await response.text()}`;
      throw new Error(message);
    }

    return await response.json(); // Success case
  }

  async getApplication(entityID: String): Promise<Application | URL | null> {
    const url = await this.discoveryApi.getBaseUrl('mta');
    const { token: idToken } = await this.identityApi.getCredentials();

    const response = await fetch(`${url}/application/entity/${entityID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
      referrerPolicy: 'no-referrer-when-downgrade',
    });

    if (response.status === 404) {
      return null;
    }
    if (response.status === 401) {
      const j = await response.json();
      return new URL(j.loginURL);
    }
    if (!response.ok) {
      const message = `Request failed with status ${
        response.status
      }: ${await response.text()}`;
      throw new Error(message);
    }

    return await response.json();
  }

  async analyzeMTAApplications(
    applicationId: string,
    analysisOptions: any,
  ): Promise<Application | URL> {
    const url = await this.discoveryApi.getBaseUrl('mta');
    const { token: idToken } = await this.identityApi.getCredentials();

    const response = await fetch(
      `${url}/analyze-application/${applicationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
        body: JSON.stringify(analysisOptions), // Make sure analysisOptions is in the correct format expected by the API
        referrerPolicy: 'no-referrer-when-downgrade',
      },
    );

    if (response.status === 401) {
      const jsonResponse = await response.json();
      return new URL(jsonResponse.loginURL); // Assuming the server redirects to a login URL if not authenticated
    }

    if (!response.ok) {
      const errorMessage = `Request failed with status ${
        response.status
      }: ${await response.text()}`;
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  constructor(options: {
    discoveryApi: DiscoveryApi;
    identityApi: IdentityApi;
  }) {
    this.discoveryApi = options.discoveryApi;
    this.identityApi = options.identityApi;
  }
}
