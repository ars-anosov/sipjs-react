import * as React from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import Copyright from './Copyright';

import Cnt_phone from './containers/Cnt_phone.jsx'

export default function App() {
  return (
    <Container maxWidth="sm">
      <br />
      <Box sx={{
        padding: 2,
        border: '1px dashed grey',
        borderRadius: 5,
        }}
      >
        <Cnt_phone />
        <br />
        <Copyright />
      </Box>
    </Container>
  );
}
