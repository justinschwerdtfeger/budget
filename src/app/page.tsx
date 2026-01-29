'use client';

import * as React from 'react';
import { Container, Box, Grid, Button, Typography, Paper, Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BudgetView from '@/components/BudgetView';
import AccountList from '@/components/AccountList';
import TransactionDialog from '@/components/TransactionDialog';
import { db } from '@/db/db';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SnackbarProvider, useSnackbar } from '@/components/AppSnackbar';

import ModeSwitch from '@/components/ModeSwitch';

export default function Home() {
  const [openTransaction, setOpenTransaction] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmConfig, setConfirmConfig] = React.useState({ title: '', content: '', action: () => { } });

  const { showSnackbar } = useSnackbar();

  const seedData = async () => {
    try {
      console.log("Seeding data...");
      const count = await db.categoryGroups.count();
      if (count > 0) {
        setConfirmConfig({
          title: "Overwrite Data?",
          content: "Data already exists. This will overwrite everything.",
          action: performSeed
        });
        setConfirmOpen(true);
        return;
      }
      await performSeed();
    } catch (e) {
      console.error("Seed Check Failed", e);
      showSnackbar("Seed Check Failed: " + e);
    }
  };

  const performSeed = async () => {
    try {
      await db.transaction('rw', [db.categoryGroups, db.categories, db.accounts, db.transactions, db.budgeted, db.budgetPeriods, db.budgetSnapshots], async () => {
        await db.categoryGroups.clear();
        await db.categories.clear();
        await db.accounts.clear();
        await db.transactions.clear();
        await db.budgeted.clear();


        // Groups
        const g1 = uuidv4();
        const g2 = uuidv4();
        await db.categoryGroups.bulkAdd([
          { id: g1, name: 'Immediate Obligations', order: 1 },
          { id: g2, name: 'True Expenses', order: 2 }
        ]);

        // Account
        const acctId = uuidv4();
        await db.accounts.add({
          id: acctId,
          name: 'Checking',
          type: 'checking'
          // balance removed
        });

        // Categories
        await db.categories.bulkAdd([
          { id: uuidv4(), group_id: g1, account_id: acctId, name: 'Rent/Mortgage', order: 1 },
          { id: uuidv4(), group_id: g1, account_id: acctId, name: 'Groceries', order: 2 },
          { id: uuidv4(), group_id: g2, account_id: acctId, name: 'Auto Maintenance', order: 1 },
        ]);

        // Initial Budget Period
        const periodId = uuidv4();
        await db.budgetPeriods.add({
          id: periodId,
          start: format(new Date(), 'yyyy-MM-dd'),
          end: null // Active
        });

        // Initial Balance Transaction for RTA (No Category)
        await db.transactions.add({
          id: uuidv4(),
          account_id: acctId,
          category_id: undefined, // RTA
          amount: 100000,
          date: format(new Date(), 'yyyy-MM-dd')
        });

        // Seed some budget assignments for the initial period
        // Rent: $0, Groceries: $0 (Clean slate for user to assign)
        // Or assign some to show functionality?
        // Let's assign $0. User can assign.
      });
      showSnackbar("Seed Data Successful!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      console.error("Seed Failed", e);
      showSnackbar("Seed Failed: " + e);
    }
  };

  const confirmReset = () => {
    setConfirmConfig({
      title: "Reset Data?",
      content: "Are you sure? This will delete ALL data vertically forever (a long time).",
      action: performReset
    });
    setConfirmOpen(true);
  };

  const performReset = async () => {
    try {
      await db.transaction('rw', [db.categoryGroups, db.categories, db.accounts, db.transactions, db.budgeted, db.budgetPeriods, db.budgetSnapshots], async () => {
        await db.categoryGroups.clear();
        await db.categories.clear();
        await db.accounts.clear();
        await db.transactions.clear();
        await db.budgeted.clear();
        await db.budgetPeriods.clear();
        await db.budgetSnapshots.clear();
      });
      const periodId = uuidv4();
      await db.budgetPeriods.add({
        id: periodId,
        start: format(new Date(), 'yyyy-MM-dd'),
        end: null // Active
      });
      showSnackbar("Reset Successful");
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      console.error("Reset Failed", e);
      showSnackbar("Reset Failed: " + e);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          My Budget
        </Typography>
        <Box>
          <Link href="/transactions" passHref style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" sx={{ mr: 1 }}>
              Transactions
            </Button>
          </Link>
          <Button color="error" onClick={confirmReset} sx={{ mr: 1 }}>
            Reset Data
          </Button>
          <Button variant="outlined" size="small" onClick={seedData} sx={{ mr: 1 }}>
            Seed Initial Data
          </Button>
          <ModeSwitch />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Sidebar: Accounts */}
        <Grid size={{ xs: 12, md: 3 }}>
          <AccountList />
        </Grid>

        {/* Main Content: Budget */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <BudgetView />
          </Paper>
        </Grid>
      </Grid>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setOpenTransaction(true)}
      >
        <AddIcon />
      </Fab>

      <TransactionDialog
        open={openTransaction}
        onClose={() => setOpenTransaction(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={confirmConfig.title}
        content={confirmConfig.content}
        onConfirm={confirmConfig.action}
        isDestructive={true}
      />
    </Container>
  );
}
