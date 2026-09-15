import { Box, Link, Stack, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { useEffect } from "react";

import { dependencies, devDependencies, version } from "../package.json";

const isDev = import.meta.env.DEV;

function Copyright({ showFull }) {
  useEffect(() => {
    if (isDev) console.log("Copyright MOUNT");
    return () => {
      if (isDev) console.log("Copyright UNMOUNT");
    };
  }, []);

  if (isDev) console.log("Copyright render");

  return (
    <Typography
      component="div"
      variant="body2"
      align="center"
      sx={{
        mt: showFull ? 2 : 0,
        fontSize: 11,
        color: "text.secondary",
      }}
    >
      <Link
        color="inherit"
        href="https://github.com/ars-anosov/sipjs-react"
        underline="none"
        sx={{
          fontWeight: "bold",
          "&:hover": { textDecoration: "underline" },
        }}
      >
        v.{version}
      </Link>

      {showFull && (
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          <Box>
            Powered by sip.js {dependencies["sip.js"]}, livekit-client {dependencies["livekit-client"]}, ky {dependencies.ky}
          </Box>
          <Box>
            react-dom {dependencies["react-dom"]}, react-redux {dependencies["react-redux"]}, @mui/material {dependencies["@mui/material"]},
            @livekit/components-react {dependencies["@livekit/components-react"]}
          </Box>
          <Box>
            vite {devDependencies.vite}, @vitejs/plugin-react {devDependencies["@vitejs/plugin-react"]}, @biomejs/biome {devDependencies["@biomejs/biome"]}
          </Box>
          <Box sx={{ mt: 1 }}>Copyright © ars {new Date().getFullYear()}</Box>
        </Stack>
      )}
    </Typography>
  );
}

Copyright.propTypes = {
  showFull: PropTypes.bool.isRequired,
};

export default Copyright;
