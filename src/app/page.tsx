'use client';

import * as React from 'react';
import { Container, Box, Grid, Button, Typography, Paper, Fab, BottomNavigation, BottomNavigationAction, useMediaQuery, useTheme, AppBar, Toolbar, IconButton, Dialog, DialogTitle, DialogContent, Slide } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';

import BudgetView from '@/components/BudgetView';
import AccountList from '@/components/AccountList';
import TransactionDialog from '@/components/TransactionDialog';
import TransactionList from '@/components/TransactionList';
import SettingsView from '@/components/SettingsView';
import TransferDialog from '@/components/TransferDialog';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import { useSnackbar } from '@/components/AppSnackbar';
import UndoFloatingButton from '@/components/UndoFloatingButton';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();

  // State
  const [activeView, setActiveView] = React.useState<'budget' | 'transactions'>('budget');
  const [mobileTab, setMobileTab] = React.useState('plan');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [openTransaction, setOpenTransaction] = React.useState(false);
  const [openTransfer, setOpenTransfer] = React.useState(false);

  const handleMobileChange = (event: React.SyntheticEvent, newValue: string) => {
    setMobileTab(newValue);
  };

  // Content Renderers
  const renderMobileContent = () => {
    switch (mobileTab) {
      case 'plan':
        return <BudgetView />;
      case 'accounts':
        return <AccountList />;
      case 'transactions':
        return <TransactionList />;
      case 'settings':
        return <SettingsView />;
      default:
        return <BudgetView />;
    }
  };

  const renderDesktopMain = () => {
    if (activeView === 'transactions') {
      return <TransactionList />;
    }
    return <BudgetView />;
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      bgcolor: 'background.default'
    }}>
      {/* Desktop App Bar */}
      {!isMobile && (
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              color={activeView === 'budget' ? 'primary' : 'inherit'}
              onClick={() => setActiveView('budget')}
              sx={{ mr: 1 }}
            >
              Budget
            </Button>
            <Button
              color={activeView === 'transactions' ? 'primary' : 'inherit'}
              onClick={() => setActiveView('transactions')}
              sx={{ mr: 1 }}
            >
              Transactions
            </Button>
            <IconButton onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Main Content Area */}
      <Box sx={{
        flexGrow: 1,
        overflow: 'auto',
        p: isMobile ? 0 : 3,
        mb: isMobile ? '56px' : 0 // Space for bottom nav
      }}>
        {isMobile ? (
          <Container maxWidth="lg" sx={{ p: 0}}>
            {renderMobileContent()}
          </Container>
        ) : (
          <Container maxWidth="xl">
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 3 }}>
                <AccountList />
              </Grid>
              <Grid size={{ xs: 12, md: 9 }}>
                {renderDesktopMain()}
              </Grid>
            </Grid>
          </Container>
        )}
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
          <BottomNavigation value={mobileTab} onChange={handleMobileChange} showLabels>
            <BottomNavigationAction label="Plan" value="plan" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Accounts" value="accounts" icon={<AccountBalanceIcon />} />
            <BottomNavigationAction label="Transactions" value="transactions" icon={<ReceiptIcon />} />
            <BottomNavigationAction label="Settings" value="settings" icon={<SettingsIcon />} />
          </BottomNavigation>
        </Paper>
      )}

      {/* Floating Add Button (only show on plan or transactions view) */}
      {(!isMobile || (mobileTab === 'plan' || mobileTab === 'transactions')) && (
        <React.Fragment>
          <Fab
            color="secondary"
            aria-label="transfer"
            sx={{
              position: 'fixed',
              bottom: isMobile ? 144 : 104,
              right: 32,
              zIndex: 1100
            }}
            onClick={() => setOpenTransfer(true)}
          >
            <SyncAltIcon />
          </Fab>
          <Fab
            color="primary"
            aria-label="add"
            sx={{
              position: 'fixed',
              bottom: isMobile ? 72 : 32,
              right: 32,
              zIndex: 1100
            }}
            onClick={() => setOpenTransaction(true)}
          >
            <AddIcon />
          </Fab>
        </React.Fragment>
      )}

      {/* Floating Undo Button */}
      {(!isMobile || mobileTab === 'plan') && (
        <UndoFloatingButton isMobile={isMobile} />
      )}

      {/* Settings Dialog (Desktop Only) */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Transition}
      >
        <DialogTitle>
          Settings
          <IconButton
            aria-label="close"
            onClick={() => setSettingsOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <SettingsView />
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <TransactionDialog
        open={openTransaction}
        onClose={() => setOpenTransaction(false)}
      />

      {/* Transfer Dialog */}
      <TransferDialog
        open={openTransfer}
        onClose={() => setOpenTransfer(false)}
      />
    </Box>
  );
}
