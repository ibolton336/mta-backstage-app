import React from 'react';
import { InfoCard, Table, TableColumn } from '@backstage/core-components';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { Button } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { mtaApiRef } from '../../api/api';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  useFetchAllEntities,
  useFetchApplication,
  useFetchApplications,
  useSaveApplicationEntity,
} from '../../queries/mta';
import { Progress, ResponseErrorPanel } from '@backstage/core-components';
import { InvalidateQueryFilters, useQueryClient } from '@tanstack/react-query';

type DenseApplicationTableProps = {
  // entityID: string;
};

export const DenseApplicationTable: React.FC<DenseApplicationTableProps> = (
  {
    // entityID,
  },
) => {
  const queryClient = useQueryClient();

  const entity = useEntity();
  const entityID = entity.entity.metadata.uid ?? '';

  const {
    applications,
    isURL,
    isFetching: isFetchingApps,
    fetchError: fetchErrorApps,
    isError: isErrorApps,
  } = useFetchApplications();

  const {
    application: applicationEntity,
    isFetching: isFetchingApp,
    fetchError: fetchErrorApp,
    isError: isErrorApp,
  } = useFetchApplication(entityID);
  const {
    entities: allEntities,
    isFetching: isFetchingAllEntities,
    fetchError: fetchErrorAllEntities,
    isError: isErrorAllEntities,
  } = useFetchAllEntities();

  const { mutate: saveApplicationEntity } = useSaveApplicationEntity({
    onSuccess: () => {
      const filters: InvalidateQueryFilters = {
        queryKey: ['entities'],
      };
      queryClient.invalidateQueries(filters);
    },
  });

  const columns: TableColumn[] = [
    { title: 'Name', field: 'name' },
    { title: 'Description', field: 'description' },
    { title: 'Assessed', field: 'assessed' },

    { title: 'mtaID', field: 'mtaID', hidden: true },
    {
      title: '',
      field: 'actions',
      render: (rowData: any) => {
        console.log('allEntities - match up ', allEntities);

        // Prepare a list of linked MTA IDs
        const listOfLinkedMTAIDs = allEntities?.map(
          entityItem => entityItem.mtaApplication,
        );

        // Determine if the current row is linked
        const isLinked = listOfLinkedMTAIDs?.includes(rowData.mtaID);

        // Determine if the current row is the currently viewed entity
        console.log('rowData', rowData, entity, applicationEntity);
        const isCurrentEntity = entity.entity.metadata.id === rowData.mtaID;

        // If the row's entity is already linked, display "Linked"
        if (isLinked) {
          return 'Linked';
        }

        // If the row's entity is not the current entity, it's not linkable
        if (!isCurrentEntity) {
          return 'Not linkable';
        }

        // For linkable and not linked entities, provide a button to link them
        return (
          <div>
            <Button
              onClick={() =>
                saveApplicationEntity({
                  applicationID: rowData.mtaID,
                  entityID,
                })
              }
            >
              <AddLinkIcon />
            </Button>
          </div>
        );
      },
    },
    //   render: (rowData: any) => {
    //     console.log('allEntities - match up ', allEntities);
    //     const listOfLinkedMTAIDs = allEntities?.map(
    //       entity => entity.mtaApplication,
    //     );
    //     const isLinked = listOfLinkedMTAIDs?.includes(rowData.mtaID);
    //     const isCurrentEntity = applicationEntity?.id === rowData.mtaID;

    //     // return isLinked || rowData.mtaID !== entityID ? (
    //     return isLinked ? (
    //       'Linked'
    //     ) : !isCurrentEntity ? (
    //       'Not linkable'
    //     ) : (
    //       <div>
    //         <Button
    //           // onClick={saveApplicationEntity({
    //           //   applicationID: rowData.mtaID,
    //           //   entityID,
    //           // })}
    //           onClick={() =>
    //             saveApplicationEntity({
    //               applicationID: rowData.mtaID,
    //               entityID,
    //             })
    //           }
    //         >
    //           <AddLinkIcon />
    //         </Button>
    //       </div>
    //     );
    //   },
    // },
  ];
  if (isFetchingApps || isFetchingApp) return <Progress />;
  if (isErrorApps && fetchErrorApps) {
    return (
      <ResponseErrorPanel
        title="Error fetching applications"
        error={fetchErrorApps}
      />
    );
  }
  const data = isURL
    ? []
    : applications?.map(application => ({
        name: application.name,
        description: application.description,
        assessed: application.assessed,
        mtaID: application.id,
      }));

  return (
    <InfoCard title="Link your Application to Component">
      <Table
        title="Application List"
        options={{ search: false, paging: true }}
        columns={columns}
        data={data}
        // actions={[
        //   {
        //     icon: (rowData: any) => <AddLinkIcon />,
        //     tooltip: 'Connect Application to MTA Application',
        //     onClick: (event, rowData: any) => {
        //       const { mtaID } = rowData;
        //       saveApplicationEntity({ applicationID: mtaID, entityID });
        //     },
        //   },
        // ]}
      />
    </InfoCard>
  );
};
