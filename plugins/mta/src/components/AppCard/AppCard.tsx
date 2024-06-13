import React from 'react';
import { Grid, Typography, Button } from '@material-ui/core';
import {
  Progress,
  ResponseErrorPanel,
  InfoCard,
} from '@backstage/core-components';
import {
  useFetchApplication,
  useSaveApplicationEntity,
} from '../../queries/mta';
import { useEntity } from '@backstage/plugin-catalog-react';

type AppCardProps = {
  entityID: string;
};

export const AppCard = ({ entityID }: AppCardProps) => {
  const entity = useEntity();
  console.log('entity', entity);
  const { application, isFetching, fetchError, isError } =
    useFetchApplication(entityID);
  const { mutate: saveApplicationEntity } = useSaveApplicationEntity();

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

  if (!application) {
    return (
      <Grid item xs={12} md={6}>
        <InfoCard title="No Application Found">
          <Typography variant="body1">
            No application data available for this ID.
          </Typography>
          {entity && entity.entity.metadata.id && (
            <Button
              variant="contained"
              color="primary"
              onClick={() =>
                saveApplicationEntity({
                  applicationID: entity.entity.metadata.id as string,
                  entityID: entityID,
                })
              }
              style={{ marginTop: 16 }}
            >
              Create New Application
            </Button>
          )}
        </InfoCard>
      </Grid>
    );
  }

  return (
    <Grid item xs={12}>
      <InfoCard title={`Application: ${application.name}`}>
        {/* Other information can be displayed here */}
      </InfoCard>
    </Grid>
  );
};
