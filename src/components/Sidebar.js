import React from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import AssignmentReturnRoundedIcon from '@mui/icons-material/AssignmentReturnRounded';
import SystemUpdateAltRoundedIcon from '@mui/icons-material/SystemUpdateAltRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';

export const DRAWER_WIDTH = 190;

const BRANCH_MENU = [
  { label: 'Dashboard', path: '/dashboard', icon: DashboardRoundedIcon },
  { divider: true, label: 'Operations' },
  { label: 'Products', path: '/products', icon: Inventory2RoundedIcon },
  { label: 'Categories', path: '/categories', icon: CategoryRoundedIcon },
  { label: 'Dealers', path: '/dealers', icon: PeopleAltRoundedIcon },
  { label: 'Sticker Printer', path: '/qr-stickers', icon: QrCodeScannerRoundedIcon },
  { label: 'Billing', path: '/billing', icon: ReceiptRoundedIcon },
  { divider: true, label: 'Reports' },
  { label: 'Sales Report', path: '/sales-report', icon: BarChartRoundedIcon },
  { label: 'Product Report', path: '/product-report', icon: AssessmentRoundedIcon },
  { label: 'Return Report', path: '/return-report', icon: AssignmentReturnRoundedIcon },
  { label: 'Restock Report', path: '/restock-report', icon: SystemUpdateAltRoundedIcon },
  { label: 'Low Stock', path: '/low-stock', icon: WarningAmberRoundedIcon },
];

const SidebarContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const menuItems = BRANCH_MENU;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper' }}>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        <List dense disablePadding>
          {menuItems.map((item, idx) => {
            if (item.divider) {
              return (
                <ListItem key={idx} sx={{ pt: idx === 0 ? 1 : 2, pb: 0.5, px: 2.5 }}>
                  <Typography
                    sx={{
                      color: 'text.disabled',
                      fontWeight: 700,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      fontSize: '0.62rem',
                    }}
                  >
                    {item.label}
                  </Typography>
                </ListItem>
              );
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <ListItem key={idx} disablePadding>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    py: 1,
                    px: 2.5,
                    position: 'relative',
                    color: isActive ? p : 'text.secondary',
                    fontWeight: isActive ? 600 : 400,
                    backgroundColor: isActive ? alpha(p, 0.06) : 'transparent',
                    borderLeft: isActive ? `3px solid ${p}` : '3px solid transparent',
                    '&:hover': {
                      backgroundColor: alpha(p, 0.05),
                      color: p,
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    <Icon sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                      color: 'inherit',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Bottom divider + version */}
      <Divider />
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
          v1.0.0 · © 2025 Chellamay Toys
        </Typography>
      </Box>
    </Box>
  );
};

const Sidebar = ({ mobileOpen, onClose, desktopOpen }) => {
  const drawerContent = <SidebarContent />;

  return (
    <Box
      component="nav"
      sx={{
        width: { md: desktopOpen ? DRAWER_WIDTH : 0 },
        flexShrink: { md: 0 },
        transition: 'width 0.3s ease',
      }}
    >
      {/* Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            top: 64,
            height: 'calc(100% - 64px)',
            border: 'none',
            boxShadow: '4px 0 28px rgba(0,0,0,0.12)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop */}
      <Drawer
        variant="persistent"
        open={desktopOpen}
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            top: 64,
            height: 'calc(100% - 64px)',
            border: 'none',
            borderRight: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            transition: 'transform 0.3s ease !important',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
