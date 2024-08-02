import React from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  CircularProgress,
} from '@material-ui/core';
import { useForm, Controller } from 'react-hook-form';
import { useFetchTargets, useFetchApplications } from '../../queries/mta';

interface IFormInput {
  type: string;
  targetList: string[];
}

export const AnalysisPage = () => {
  const { control, handleSubmit, setValue } = useForm<IFormInput>({
    defaultValues: {
      type: '',
      targetList: [],
    },
  });
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const { targets } = useFetchTargets();
  const { applications } = useFetchApplications();

  // Flatten the labels into a single array of options
  const labelOptions = targets
    ? targets.flatMap(target =>
        target?.labels?.map(label => ({
          label: label.label,
          name: label.name,
        })),
      )
    : [];

  const onSubmit = (data: IFormInput) => {
    setIsAnalyzing(true);
    console.log(data);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 2000); // Simulates 2 seconds of analysis
  };
  console.log('targets', targets);
  return (
    <Box sx={{ width: '100%', padding: 4 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Type</InputLabel>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                label="Type"
                // onChange={e => setValue('type', e.target.value)}
              >
                {['Source', 'Source + Dependencies'].map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Target List</InputLabel>
          <Controller
            name="targetList"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                label="Target List"
                multiple
                // onChange={e => setValue('targetList', e.target.value)}
                // renderValue={selected => selected.join(', ')}
              >
                {labelOptions.map(label => (
                  <MenuItem key={label?.label} value={label?.label}>
                    {label?.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>
        <Button type="submit" variant="contained" style={{ marginTop: '15px' }}>
          Analyze
        </Button>
      </form>
      {isAnalyzing && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <CircularProgress />
          <Box sx={{ ml: 2 }}>Analyzing...</Box>
        </Box>
      )}
    </Box>
  );
};
