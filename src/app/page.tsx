import * as React from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import MainList from "@/components/MainList";

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
          <MainList />
        </Box>
      </Container>
  );
}
