import { useQuery, QueryFunction } from '@tanstack/react-query';
import { mtaApiRef, Application, MTAApi } from '../api/api';
import { useApi } from '@backstage/core-plugin-api';

export const useFetchApplication = (entityID?: any) => {
  const api = useApi(mtaApiRef);

  const fetchApplication: QueryFunction<Application | URL> = async () => {
    const result = await api.getApplication(entityID);
    if (result === undefined) {
      // Handle undefined case, throw an error or return a default value
      throw new Error('Application not found');
    }
    return result;
  };

  const { isLoading, error, data, isError } = useQuery<
    Application | URL,
    Error
  >({
    enabled: !!entityID,
    queryKey: [entityID],
    queryFn: fetchApplication,
    select: (application: Application | URL) => {
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
        // Here we need to redirect dminthem to login MTA.
        window.location.href = applications.toString();
        // Optionally return a default or placeholder value if redirection is handled asynchronously
        return applications; // This would be a non-issue if you handle redirection synchronously
      }
      return applications;
    },
  });

  return {
    applications: data as Application[],
    isFetching: isLoading,
    fetchError: error,
    isError: isError,
  };
};