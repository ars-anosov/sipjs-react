import {
  Typography,
  Link
} from '@mui/material'

import { version, dependencies, devDependencies } from '../package.json'

export default function Copyright() {
  return (
    <Typography
      variant="body2"
      align="center"
      
      sx={{
        mt: 2,
        fontSize: 11,
        color: 'text.secondary',
      }}
    >
      powered by
      sip.js {dependencies['sip.js']},
      react-dom {dependencies['react-dom']},
      react-redux {dependencies['react-redux']},
      @mui/material {dependencies['@mui/material']},
      vite {devDependencies['vite']}
      <br />
      <strong>v.{version}</strong>
      {' Copyright © '}
      <Link color="inherit" href="https://github.com/ars-anosov/sipjs-react">
        ars
      </Link>{' '}
      {new Date().getFullYear()}.
    </Typography>
  )
}
