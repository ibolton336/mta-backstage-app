import React, { useEffect, useState } from 'react';
import { InfoCard, LinkButton } from '@backstage/core-components';
import {
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
} from '@material-ui/core';
import { useEntity } from '@backstage/plugin-catalog-react';
import { Application } from '../../api/api';
import { useFetchAllEntities, useFetchApplications } from '../../queries/mta';

const ApplicationDetails = () => {
  const entity = useEntity();
  const application = entity?.entity?.metadata
    .application as unknown as Application;

  const annotations = entity?.entity?.metadata?.annotations || {};
  const viewUrl = annotations['issues-url'] || '';
  if (!application) {
    return null;
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <InfoCard title={`Application: ${application?.name}`}>
          <List dense>
            <LinkButton to={viewUrl} target="_blank">
              View Issues
            </LinkButton>
            <ListItem>
              <ListItemText primary="ID" secondary={application.id} />
            </ListItem>
            {/* <ListItem>
              <ListItemText
                primary="Tags"
                secondary={
                  <div>
                    {application.tags && application.tags.length > 0 ? (
                      application.tags.map(tag => (
                        <Chip
                          key={tag.name}
                          label={`Source: ${tag.source || 'Unknown'}, Name: ${
                            tag.name
                          }`}
                          onClick={() =>
                            console.log(`Tag clicked: ${tag.name}`)
                          } // Example handler
                          style={{ margin: 2 }}
                        />
                      ))
                    ) : (
                      <Typography variant="body2">No Tags</Typography>
                    )}
                  </div>
                }
              />
            </ListItem>
            <ListItem></ListItem> */}
            <ListItem>
              <ListItemText primary="Tags" />
              {/* <T */}
            </ListItem>
            {/* <Typography variant="subtitle1">Tags</Typography> */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
                gap: 1,
                overflowX: 'auto', // Horizontal scroll
                p: 1,
                maxWidth: 1560, // Adjust based on your layout
                '&::-webkit-scrollbar': {
                  height: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,.1)',
                  borderRadius: '4px',
                },
              }}
            >
              {application.tags && application.tags.length > 0 ? (
                application.tags.map(tag => (
                  <Chip
                    key={tag?.id}
                    label={`Source: ${tag.source || 'Unknown'}, Name: ${
                      tag?.name
                    }`}
                    style={{ margin: 2 }}
                  />
                ))
              ) : (
                <Typography variant="body2">No Tags</Typography>
              )}
            </Box>
            {/* <ListItem>
              <ListItemText
                primary="Created By"
                secondary={application.createUser || 'N/A'}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Created Time"
                secondary={new Date(application.createTime).toLocaleString()}
              />
            </ListItem> */}
            <ListItem>
              <ListItemText
                primary="Risk Level"
                secondary={application.risk || 'None'}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Effort"
                secondary={
                  application.effort === 0
                    ? 'No effort calculated'
                    : application.effort
                }
              />
            </ListItem>
          </List>
          <Typography variant="subtitle1">Details</Typography>
          <List dense>
            {application.description ? (
              <ListItem>
                <ListItemText
                  primary="Description"
                  secondary={application.description}
                />
              </ListItem>
            ) : null}
            {application.comments ? (
              <ListItem>
                <ListItemText
                  primary="Comments"
                  secondary={application.comments}
                />
              </ListItem>
            ) : null}
            {application.bucket && application.bucket.id ? (
              <ListItem>
                <ListItemText
                  primary="Bucket ID"
                  secondary={application.bucket.id}
                />
              </ListItem>
            ) : null}
            <ListItem>
              <ListItemText primary="Binary" secondary={application.binary} />
            </ListItem>
          </List>
        </InfoCard>
      </Grid>
    </Grid>
  );
};

export default ApplicationDetails;
