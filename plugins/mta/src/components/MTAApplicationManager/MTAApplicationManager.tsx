import React from 'react';
import { Grid } from '@material-ui/core';
import { ResponseErrorPanel } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { DenseApplicationTable } from '../DenseApplicationTable/DenseApplicationTable';
import { AppCard } from '../AppCard/AppCard';

export const MTAApplicationManager = () => {
  const entity = useEntity();

  const entityID = entity.entity.metadata.uid ?? '';

  if (!entity) {
    return (
      <ResponseErrorPanel
        title="No entity context available"
        error={
          new Error('This component must be used within an entity context.')
        }
      />
    );
  }

  return (
    <Grid container spacing={2}>
      {entityID && (
        <Grid item xs={12} sm={6}>
          <AppCard entityID={entityID} />
        </Grid>
      )}

      <Grid item xs={12} sm={entityID ? 6 : 12}>
        <DenseApplicationTable entityID={entityID} />
      </Grid>
    </Grid>
  );
};
