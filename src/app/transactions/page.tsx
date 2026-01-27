'use client';

import * as React from 'react';
import { Container, Box, Button } from '@mui/material';
import TransactionList from '@/components/TransactionList';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function TransactionsPage() {
    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Link href="/" passHref>
                    <Button startIcon={<ArrowBackIcon />}>
                        Back to Budget
                    </Button>
                </Link>
            </Box>
            <TransactionList />
        </Container>
    );
}
