import React from 'react';
import { InfoCard, Table, TableColumn } from '@backstage/core-components';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { useApi } from '@backstage/core-plugin-api';
import { mtaApiRef } from '../../api/api';
import {
  useFetchApplications,
  useSaveApplicationEntity,
} from '../../queries/mta';
import { Progress, ResponseErrorPanel } from '@backstage/core-components';

type DenseApplicationTableProps = {
  entityID: string;
};

export const DenseApplicationTable: React.FC<DenseApplicationTableProps> = ({
  entityID,
}) => {
  const api = useApi(mtaApiRef);
  const { mutate: saveApplicationEntity } = useSaveApplicationEntity();

  const {
    applications,
    isURL,
    isFetching: isFetchingApps,
    fetchError: fetchErrorApps,
    isError: isErrorApps,
  } = useFetchApplications();

  const columns: TableColumn[] = [
    { title: 'Name', field: 'name' },
    { title: 'Description', field: 'description' },
    { title: 'Assessed', field: 'assessed' },
    { title: 'mtaID', field: 'mtaID', hidden: true },
  ];
  if (isFetchingApps) return <Progress />;
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
        actions={[
          {
            icon: () => <AddLinkIcon />,
            tooltip: 'Connect Application to MTA Application',
            onClick: (event, rowData: any) => {
              const { mtaID } = rowData;
              saveApplicationEntity({ applicationID: mtaID, entityID });
            },
          },
        ]}
      />
    </InfoCard>
  );
};
