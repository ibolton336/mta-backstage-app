import React from 'react';
import { Grid, Tab, Tabs, Box, Typography } from '@material-ui/core';
import { ResponseErrorPanel } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { AppCard } from '../AppCard/AppCard';

export const MTAApplicationManager = () => {
  const entity = useEntity();
  const entityID = entity.entity.metadata.uid ?? '';
  const [tab, setTab] = React.useState(0);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

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
    <Box sx={{ width: '100%' }}>
      {/* Display the application name and some details */}
      <Typography variant="h5" gutterBottom>
        Application Name: {entity.entity.metadata.name}
      </Typography>
      <Typography variant="body1" gutterBottom>
        Unique ID: {entity.entity.metadata.uid}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 10 }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          aria-label="Application tabs"
        >
          <Tab label="Application" />
          <Tab label="Issues" />
          {/* <Tab label="Effort" /> */}
        </Tabs>
      </Box>

      {/* Conditional rendering of tab panels */}
      <Grid item xs={12} role="tabpanel" hidden={tab !== 0} id={`tabpanel-0`}>
        <AppCard />
      </Grid>
      {/* <Grid item xs={12} role="tabpanel" hidden={tab !== 1} id={`tabpanel-1`}>
        <IssuesTable />
      </Grid> */}
      {/* <Grid item xs={12} role="tabpanel" hidden={tab !== 1} id={`tabpanel-1`}>
        </>
      </Grid> */}
    </Box>
  );
};
