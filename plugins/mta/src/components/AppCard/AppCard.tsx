import React from 'react';
import {
  Grid,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
} from '@material-ui/core';
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
import { Application } from '../../api/api';
import ApplicationDetails from './ApplicationDetails';

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
  console.log('application', application);
  return <ApplicationDetails {...application} />;
};
// import React from 'react';
// import { Grid, Typography, List, ListItem, ListItemText } from '@mui/material';
// import InfoCard from './InfoCard'; // Assuming InfoCard is a custom component that accepts children

// const ApplicationDetails = (application: Application) => {
//   return (
//     <Grid container spacing={2}>
//       <Grid item xs={12}>
//         <InfoCard title={`Application: ${application.name}`}>
//           <Typography variant="subtitle1">General Information</Typography>
//           <List dense>
//             <ListItem>
//               <ListItemText primary="ID" secondary={application.id} />
//             </ListItem>
//             {/* <ListItem>
//               <ListItemText
//                 primary="Created By"
//                 secondary={application.createUser || 'N/A'}
//               />
//             </ListItem>
//             <ListItem>
//               <ListItemText
//                 primary="Created Time"
//                 secondary={new Date(application.createTime).toLocaleString()}
//               />
//             </ListItem> */}
//             <ListItem>
//               <ListItemText
//                 primary="Risk Level"
//                 secondary={application.risk || 'None'}
//               />
//             </ListItem>
//             <ListItem>
//               <ListItemText
//                 primary="Effort"
//                 secondary={
//                   application.effort === 0
//                     ? 'No effort calculated'
//                     : application.effort
//                 }
//               />
//             </ListItem>
//           </List>
//           <Typography variant="subtitle1">Details</Typography>
//           <List dense>
//             {application.description ? (
//               <ListItem>
//                 <ListItemText
//                   primary="Description"
//                   secondary={application.description}
//                 />
//               </ListItem>
//             ) : null}
//             {application.comments ? (
//               <ListItem>
//                 <ListItemText
//                   primary="Comments"
//                   secondary={application.comments}
//                 />
//               </ListItem>
//             ) : null}
//             {application.bucket && application.bucket.id ? (
//               <ListItem>
//                 <ListItemText
//                   primary="Bucket ID"
//                   secondary={application.bucket.id}
//                 />
//               </ListItem>
//             ) : null}
//             <ListItem>
//               <ListItemText primary="Binary" secondary={application.binary} />
//             </ListItem>
//           </List>
//         </InfoCard>
//       </Grid>
//     </Grid>
//   );
// };

// export default ApplicationDetails;
