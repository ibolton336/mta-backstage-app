import React from 'react';
import { Divider, Grid } from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';
import { MTAApplicationManager } from '../MTAApplicationManager/MTAApplicationManager';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient();
export const App = () => (
  <QueryClientProvider client={queryClient}>
    <Page themeId="tool">
      <Header title="Application Moderinization and Migration Info" />
      <Content>
        <ContentHeader title="MTA Quick Overview">
          <SupportButton>A description of your plugin goes here.</SupportButton>
        </ContentHeader>
        <Divider style={{ margin: '2em 0' }} /> {/* Adjust margin as needed */}
        <Grid container spacing={3} direction="column">
          <MTAApplicationManager />
        </Grid>
      </Content>
    </Page>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
