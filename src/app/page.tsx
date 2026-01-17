import * as React from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import MainList from "@/components/MainList";
import Typography from "@mui/material/Typography";

export default function Home() {
  return (
      <Container maxWidth="lg">
        <Box
            sx={{
              my: 4,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
        >
          <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
            Material UI - Next.js example in TypeScript
          </Typography>
          <MainList />
        </Box>
      </Container>
  );
}
