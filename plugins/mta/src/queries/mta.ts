import {
  useQuery,
  QueryFunction,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { mtaApiRef, Application, MTAApi, Target } from '../api/api';
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
      if (application instanceof URL) {
        // Here we need to redirect dminthem to login MTA.
        window.location.href = application.toString();
        // Optionally return a default or placeholder value if redirection is handled asynchronously
        return application; // This would be a non-issue if you handle redirection synchronously
      }
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

// export const useSaveApplicationEntity = (
//   options?: UseSaveApplicationEntityOptions,
// ) => {
//   const { onSuccess } = options ?? {};
//   const api = useApi(mtaApiRef);

//   const saveApplicationEntity = async ({
//     applicationID,
//     entityID,
//   }: {
//     applicationID: string;
//     entityID: string;
//   }): Promise<Application | URL> => {
//     return await api.saveApplicationEntity(applicationID, entityID);
//   };

//   const mutation = useMutation<
//     Application | URL,
//     Error,
//     { applicationID: string; entityID: string }
//   >({
//     mutationFn: saveApplicationEntity,
//     onSuccess: data => {
//       if (data instanceof URL) {
//         window.location.href = data.toString(); // handle redirection
//       }
//       if (onSuccess) onSuccess();
//     },
//     onError: error => {
//       console.error('Error during saving application entity:', error);
//     },
//   });

//   return mutation;
// };

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

export const TargetsQueryKey = 'targets';

// export const useFetchTargets = () => {
//   const { data, isLoading, error, refetch } = useQuery<Target[]>({
//     queryKey: [TargetsQueryKey],
//     queryFn: async () => await getTargets(),
//     // onError: err => console.log(err),
//   });

//   return {
//     targets: data || [],
//     isFetching: isLoading,
//     fetchError: error,
//     refetch,
//   };
// };
export const useFetchTargets = () => {
  const api = useApi(mtaApiRef);

  const fetchTargets: QueryFunction<Target[] | URL> = async () => {
    const result = await api.getTargets();
    if (result === undefined) {
      // Handle undefined case, throw an error or return a default value
      throw new Error('Targets not found');
    }
    return result;
  };

  const { isLoading, error, data, isError } = useQuery<Target[] | URL, Error>({
    queryKey: [TargetsQueryKey],
    queryFn: fetchTargets,
    select: (targets: Target[] | URL) => {
      if (targets instanceof URL) {
        window.location.href = targets.toString();
        return targets;
      }
      return targets;
    },
  });

  return {
    isURL: data instanceof URL,
    targets: data as Target[],
    isFetching: isLoading,
    fetchError: error,
    isError: isError,
  };
};

interface AnalyzeApplicationParams {
  selectedApp: string; // Assuming 'selectedApp' is actually a string ID
  analysisOptions: any; // Keep 'any' or define a more specific type if possible
}
interface UseAnalyzeApplicationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}
export const useAnalyzeApplication = (
  options?: UseAnalyzeApplicationOptions,
) => {
  const api = useApi(mtaApiRef);
  const queryClient = useQueryClient();

  const analyzeApplications = async ({
    selectedApp,
    analysisOptions,
  }: AnalyzeApplicationParams) => {
    return await api.analyzeMTAApplications(selectedApp, analysisOptions);
  };

  const mutation = useMutation<
    AnalyzeApplicationParams | URL,
    Error,
    AnalyzeApplicationParams
  >({
    mutationFn: analyzeApplications,
    onSuccess: data => {
      if (data instanceof URL) {
        window.location.href = data.toString(); // handle redirection
      }
      if (options?.onSuccess) {
        options.onSuccess();
        queryClient.invalidateQueries();
      }
    },
    onError: error => {
      console.error('Error during saving application entity:', error);
    },
  });

  return mutation;
};
