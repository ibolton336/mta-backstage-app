import React from 'react';
import { Grid, Typography } from '@material-ui/core';
import {
  Progress,
  ResponseErrorPanel,
  InfoCard,
} from '@backstage/core-components';
import { useFetchApplication } from '../../queries/mta';

type AppCardProps = {
  entityID: string;
};

export const AppCard = ({ entityID }: AppCardProps) => {
  const { application, isFetching, fetchError, isError } =
    useFetchApplication(entityID);

  if (isFetching) {
    return <Progress />;
  }

  if (isError && fetchError) {
    return (
      <ResponseErrorPanel
        title="Error fetching application"
        error={fetchError}
      />
    );
  }

  //   if (!application) {
  //     return (
  //       <ResponseErrorPanel
  //         title="Unable to find application"
  //         error={new Error('Application data is missing')}
  //       />
  //     );
  //   }

  // Handle null (no application found) distinctly from errors
  if (!application) {
    return (
      <Grid item xs={12} md={6}>
        <InfoCard title="No Application Found">
          <Typography variant="body1">
            No application data available for this ID.
          </Typography>
        </InfoCard>
      </Grid>
    );
  }

  return (
    <Grid item>
      <InfoCard title={application.name} />
    </Grid>
  );
};
