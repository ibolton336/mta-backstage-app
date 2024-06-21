import {
  DiscoveryApi,
  IdentityApi,
  createApiRef,
} from '@backstage/core-plugin-api';

export type Tags = {
  name: string;
  source: SourceBuffer;
  virutal: boolean;
};

export type Ref = {
  id: number;
  name: string;
};

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
  getAllEntities(): Promise<any[]>;
  saveApplicationEntity(
    applicationID: string,
    entityID: any,
  ): Promise<Application | URL>;
  getExample(): { example: string };
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

  async saveApplicationEntity(
    applicationID: string,
    entityID: string,
  ): Promise<Application | URL> {
    const url = await this.discoveryApi.getBaseUrl('mta');
    const { token: idToken } = await this.identityApi.getCredentials();

    const response = await fetch(`${url}/application/entity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
      body: JSON.stringify({ applicationID, entityID }),
      referrerPolicy: 'no-referrer-when-downgrade',
      redirect: 'error',
    });

    if (response.status === 401) {
      const j = await response.json();
      return new URL(j.loginURL); // Redirect for login
    }

    if (!response.ok) {
      const message = `Request failed with ${response.status} ${
        response.statusText
      }: ${await response.json()}`;
      throw new Error(message);
    }

    return await response.json(); // Success case
  }

  constructor(options: {
    discoveryApi: DiscoveryApi;
    identityApi: IdentityApi;
  }) {
    this.discoveryApi = options.discoveryApi;
    this.identityApi = options.identityApi;
  }

  getExample(): { example: string } {
    return { example: 'Hello World!' };
  }
}
