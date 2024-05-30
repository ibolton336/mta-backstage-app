import React from 'react';
import { Typography, Grid } from '@material-ui/core';
import {
  InfoCard,
  Header,
  Page,
  Content,
  ContentHeader,
  HeaderLabel,
  SupportButton,
} from '@backstage/core-components';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { MTAApplicationManager } from '../MTAApplicationManager/MTAApplicationManager';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';

const queryClient = new QueryClient();
export const App = () => (
  <QueryClientProvider client={queryClient}>
    <Page themeId="tool">
      <Header title="Application Moderinization and Migration Info" />
      <Content>
        <ContentHeader title="MTA Quick Overview">
          <SupportButton>A description of your plugin goes here.</SupportButton>
        </ContentHeader>
        <Grid container spacing={3} direction="column">
          <MTAApplicationManager />
        </Grid>
      </Content>
    </Page>
  </QueryClientProvider>
);
