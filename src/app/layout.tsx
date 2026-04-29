import * as React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import theme from '@/theme';
import ModeSwitch from '@/components/ModeSwitch';
import '@/app/global.css';
import { UndoProvider } from '@/components/UndoProvider';
import { SnackbarProvider } from '@/components/AppSnackbar';
import { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL("localhost:3000"), // use a correct url otherwise your app won’t build
  title: "BursaBudget",
  description: "Your personal finance manager",
  category: "website",
  generator: "Next.js", // framework used

  // the big is here 
  manifest: "/manifest.json",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Bursa" />
      </head>
      <body>
        <InitColorSchemeScript attribute="class" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
            <CssBaseline />
            <UndoProvider>
              <SnackbarProvider>
                {props.children}
              </SnackbarProvider>
            </UndoProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
