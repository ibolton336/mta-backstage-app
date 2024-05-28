import React from 'react';
import { InfoCard, Table, TableColumn } from '@backstage/core-components';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { Application, MTAApi } from '../../api/api';

type DenseApplicationTableProps = {
  applications: Application[];
  api: MTAApi;
  entityID: string;
};

export const DenseApplicationTable: React.FC<DenseApplicationTableProps> = ({
  applications,
  api,
  entityID,
}) => {
  const columns: TableColumn[] = [
    { title: 'Name', field: 'name' },
    { title: 'Description', field: 'description' },
    { title: 'Assessed', field: 'assessed' },
    { title: 'mtaID', field: 'mtaID', hidden: true },
  ];

  const data = applications.map(application => ({
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
              api.saveApplicationEntity(mtaID, entityID);
            },
          },
        ]}
      />
    </InfoCard>
  );
};
