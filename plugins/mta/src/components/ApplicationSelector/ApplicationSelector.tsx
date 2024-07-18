// Example of a React component using Material-UI for the dropdown
import React from 'react';
import { MenuItem, FormControl, Select, InputLabel } from '@material-ui/core';

const ApplicationSelector = ({ applications, onSelect }) => (
  <FormControl fullWidth>
    <InputLabel id="app-selector-label">Application</InputLabel>
    <Select
      labelId="app-selector-label"
      id="app-selector"
      onChange={e => onSelect(e.target.value)}
      label="Application"
    >
      {applications.map(app => (
        <MenuItem key={app.name} value={app.name}>
          {app.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

export default ApplicationSelector;
