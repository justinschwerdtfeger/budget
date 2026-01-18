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

export default function Home() {
  const [openTransaction, setOpenTransaction] = React.useState(false);

  const seedData = async () => {
    try {
      console.log("Seeding data...");
      // Check if data exists
      const count = await db.categoryGroups.count();
      if (count > 0) {
        if (!window.confirm("Data already exists. Overwrite?")) return;
        await db.transaction('rw', [db.categoryGroups, db.categories, db.accounts, db.transactions, db.budgeted], async () => {
          await db.categoryGroups.clear();
          await db.categories.clear();
          await db.accounts.clear();
          await db.transactions.clear();
          await db.budgeted.clear();
        });
      }

      await db.transaction('rw', [db.categoryGroups, db.categories, db.accounts, db.transactions], async () => {
        // Groups
        const g1 = uuidv4();
        const g2 = uuidv4();
        await db.categoryGroups.bulkAdd([
          { id: g1, name: 'Immediate Obligations', order: 1 },
          { id: g2, name: 'True Expenses', order: 2 }
        ]);

        // Categories
        await db.categories.bulkAdd([
          { id: uuidv4(), group_id: g1, name: 'Rent/Mortgage', order: 1 },
          { id: uuidv4(), group_id: g1, name: 'Groceries', order: 2 },
          { id: uuidv4(), group_id: g2, name: 'Auto Maintenance', order: 1 },
        ]);

        // Account
        const acctId = uuidv4();
        await db.accounts.add({
          id: acctId,
          name: 'Checking',
          type: 'checking',
          balance: 100000 // $1000.00
        });

        // Initial Balance Transaction for RTA
        await db.transactions.add({
          id: uuidv4(),
          account_id: acctId,
          amount: 100000,
          date: format(new Date(), 'yyyy-MM-dd')
          // No category_id implies "Ready to Assign"
        });
      });
      console.log("Seeding complete");
      alert("Seed Data Successful!");
      window.location.reload();
    } catch (e) {
      console.error("Seed Failed", e);
      alert("Seed Failed: " + e);
    }
  };

  const resetData = async () => {
    // if (!window.confirm("Are you sure? This will delete ALL data.")) return;

    try {
      await db.transaction('rw', [db.categoryGroups, db.categories, db.accounts, db.transactions, db.budgeted], async () => {
        await db.categoryGroups.clear();
        await db.categories.clear();
        await db.accounts.clear();
        await db.transactions.clear();
        await db.budgeted.clear();
      });
      alert("Reset Successful");
      window.location.reload();
    } catch (e) {
      console.error("Reset Failed", e);
      alert("Reset Failed: " + e);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          My Budget
        </Typography>
        <Box>
          <Button color="error" onClick={resetData} sx={{ mr: 1 }}>
            Reset Data
          </Button>
          <Button variant="outlined" size="small" onClick={seedData}>
            Seed Initial Data
          </Button>
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
    </Container>
  );
}
