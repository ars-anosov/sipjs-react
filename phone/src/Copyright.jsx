import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import {
  Typography,
  Link
} from '@mui/material'

import { version, dependencies, devDependencies } from '../package.json'



function Copyright(props) {
  if (process.env.NODE_ENV === 'development') console.log('Copyright hook')

  const {
    showFull
  } = props



  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('Copyright MOUNT')

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('Copyright UNMOUNT')
    }
  }, [])



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
      {showFull && (
      <span>
        Powered by
        sip.js {dependencies['sip.js']},
        livekit-client {dependencies['livekit-client']},
        axios {dependencies['axios']}
        <br />
        react-dom {dependencies['react-dom']},
        react-redux {dependencies['react-redux']},
        @mui/material {dependencies['@mui/material']},
        @livekit/components-react {dependencies['@livekit/components-react']}
        <br />
        vite {devDependencies['vite']},
        @vitejs/plugin-react {devDependencies['@vitejs/plugin-react']}
        <br /><br />
      </span>
      )}
      
      <strong>v.{version}</strong>
      {' Copyright © '}
      <Link color="inherit" href="https://github.com/ars-anosov/sipjs-react">
        ars
      </Link>{' '}
      {new Date().getFullYear()}.
    </Typography>
  )
}

Copyright.propTypes = {
  showFull             : PropTypes.bool.isRequired,
}

export default Copyright