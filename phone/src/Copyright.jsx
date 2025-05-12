import * as React from 'react';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

import pkg from '../package.json'

export default function Copyright() {
  return (
    <Typography
      variant="body2"
      align="center"
      sx={{
        'font-size': '11px',
        color: 'text.secondary',
      }}
    >
      Powered by
      vite {pkg.devDependencies['vite']},
      react-dom {pkg.dependencies['react-dom']},
      react-redux {pkg.dependencies['react-redux']},
      @mui/material {pkg.dependencies['@mui/material']},
      sip.js {pkg.dependencies['sip.js']}
      <br />
      {'Copyright © '}
      <Link color="inherit" href="https://sbc.pecom.ru/">
        sbc.pecom.ru
      </Link>{' '}
      {new Date().getFullYear()}.
    </Typography>
  );
}
