import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
} from '@material-ui/core';
import React, { useState } from 'react';
import { useFetchApplications, useFetchTargets } from '../../queries/mta';

export const AnalysisPage = () => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    type: '',
    targetList: [],
  });
  const types = ['Type 1', 'Type 2', 'Type 3']; // Dummy types, replace with actual data
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { targets } = useFetchTargets();
  const { applications } = useFetchApplications();

  const handleTypeChange = (event: any) => {
    setFormData({ ...formData, type: event.target.value });
  };

  const handleTargetChange = (event: any) => {
    setFormData({ ...formData, targetList: event.target.value });
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Simulate analysis time
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 2000); // Simulates 2 seconds of analysis
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  return (
    <Box sx={{ width: '100%', padding: 4 }}>
      {step === 0 && (
        <>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type}
              label="Type"
              onChange={handleTypeChange}
            >
              {types.map(type => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Target List</InputLabel>
            <Select
              multiple
              value={formData.targetList}
              onChange={handleTargetChange}
              //   renderValue={selected => selected.join(', ')}
            >
              {/* {targets.map(target => (
                <MenuItem key={target.id} value={target.name}>
                  <Checkbox
                  // checked={formData.targetList.indexOf(target) > -1}
                  />
                  <ListItemText primary={target.name} />
                </MenuItem>
              ))} */}
            </Select>
          </FormControl>
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        </>
      )}
      {step === 1 && (
        <>
          <Button onClick={handleBack}>Back</Button>
          {/* <Button
            onClick={handleAnalyze}
            variant="contained"
            sx={{ mt: 2, ml: 2 }}
          >
            Analyze
          </Button> */}
          {isAnalyzing && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <CircularProgress />
              <Box sx={{ ml: 2 }}>Analyzing...</Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
