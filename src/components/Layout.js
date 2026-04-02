import React, { useState } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  const handleMenuClick = () => {
    if (isDesktop) {
      setDesktopOpen((prev) => !prev);
    } else {
      setMobileOpen((prev) => !prev);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Header onMenuClick={handleMenuClick} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} desktopOpen={desktopOpen} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }} />
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
