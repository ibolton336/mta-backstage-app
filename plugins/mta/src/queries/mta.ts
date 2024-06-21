import { useQuery, QueryFunction, useMutation } from '@tanstack/react-query';
import { mtaApiRef, Application, MTAApi } from '../api/api';
import { useApi } from '@backstage/core-plugin-api';

interface MTAEntity {
  entityUID: string;
  mtaApplication: number | string;
}

export const useFetchApplication = (entityID?: any) => {
  const api = useApi(mtaApiRef);

  const fetchApplication: QueryFunction<
    Application | URL | null
  > = async () => {
    const result = await api.getApplication(entityID);
    if (result === undefined) {
      // Handle undefined case, throw an error or return a default value
      throw new Error('Application not found');
    }
    return result;
  };

  const { isLoading, error, data, isError } = useQuery<
    Application | URL | null,
    Error
  >({
    enabled: !!entityID,
    queryKey: [entityID],
    queryFn: fetchApplication,
    select: (application: Application | URL | null) => {
      // if (application instanceof URL) {
      //   // Here we need to redirect dminthem to login MTA.
      //   window.location.href = application.toString();
      //   // Optionally return a default or placeholder value if redirection is handled asynchronously
      //   return application; // This would be a non-issue if you handle redirection synchronously
      // }
      return application;
    },
  });

  return {
    application: data as Application,
    isFetching: isLoading,
    fetchError: error,
    isError: isError,
  };
};

export const useFetchApplications = () => {
  const api = useApi(mtaApiRef);

  const fetchApplications: QueryFunction<Application[] | URL> = async () => {
    const result = await api.getApplications();
    if (result === undefined) {
      // Handle undefined case, throw an error or return a default value
      throw new Error('Applications not found');
    }
    return result;
  };

  const { isLoading, error, data, isError } = useQuery<
    Application[] | URL,
    Error
  >({
    queryKey: ['applications'],
    queryFn: fetchApplications,
    select: (applications: Application[] | URL) => {
      if (applications instanceof URL) {
        window.location.href = applications.toString();
        return applications;
      }
      return applications;
    },
  });

  return {
    isURL: data instanceof URL,
    applications: data as Application[],
    isFetching: isLoading,
    fetchError: error,
    isError: isError,
  };
};

type UseSaveApplicationEntityOptions = {
  onSuccess?: () => void;
};

export const useSaveApplicationEntity = (
  options?: UseSaveApplicationEntityOptions,
) => {
  const { onSuccess } = options ?? {};
  const api = useApi(mtaApiRef);

  const saveApplicationEntity = async ({
    applicationID,
    entityID,
  }: {
    applicationID: string;
    entityID: string;
  }): Promise<Application | URL> => {
    return await api.saveApplicationEntity(applicationID, entityID);
  };

  const mutation = useMutation<
    Application | URL,
    Error,
    { applicationID: string; entityID: string }
  >({
    mutationFn: saveApplicationEntity,
    onSuccess: data => {
      if (data instanceof URL) {
        window.location.href = data.toString(); // handle redirection
      }
      if (onSuccess) onSuccess();
    },
    onError: error => {
      console.error('Error during saving application entity:', error);
    },
  });

  return mutation;
};

export const useFetchAllEntities = () => {
  const api = useApi(mtaApiRef);

  const fetchAllEntities: QueryFunction<any[]> = async () => {
    const result = await api.getAllEntities();
    if (!result) {
      // Handle undefined or empty case, throw an error or return a default value
      throw new Error('No entities found');
    }
    return result;
  };
  const { isLoading, error, data, isError } = useQuery<MTAEntity[], Error>({
    queryKey: ['entities'],
    queryFn: fetchAllEntities,
    select: (entities: any[]) => {
      return entities;
    },
  });

  return {
    entities: data,
    isFetching: isLoading,
    fetchError: error,
    isError: isError,
  };
};
