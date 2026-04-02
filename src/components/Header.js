import React, { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, Box, Avatar, Typography,
  Menu, MenuItem, Divider, Tooltip, Popover,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/Logo.png';

const Header = ({ onMenuClick }) => {
  const { profile, signOut } = useAuth();
  const { themeKey, setThemeKey, themes, activeTheme } = useThemeContext();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [paletteAnchor, setPaletteAnchor] = useState(null);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: '100%',
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
        zIndex: (t) => t.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 3 }, gap: 1 }}>
        {/* Hamburger */}
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ color: 'text.secondary', mr: 0.5, '&:hover': { color: 'primary.main' } }}
        >
          <MenuRoundedIcon />
        </IconButton>

        {/* Logo */}
        <img src={logo} alt="Chellamay logo" style={{ height: 64, width: 150, filter: activeTheme.logoFilter }} />

        <Box sx={{ flex: 1 }} />

        {/* Theme Picker */}
        <Tooltip title="Change theme">
          <IconButton
            onClick={(e) => setPaletteAnchor(e.currentTarget)}
            sx={{ color: 'text.secondary', mr: 0.5, '&:hover': { color: 'primary.main' } }}
          >
            <PaletteRoundedIcon />
          </IconButton>
        </Tooltip>

        <Popover
          open={Boolean(paletteAnchor)}
          anchorEl={paletteAnchor}
          onClose={() => setPaletteAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              mt: 1, p: 1.5, borderRadius: '14px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              border: '1.5px solid rgba(0,0,0,0.08)',
            },
          }}
        >
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', mb: 1, px: 0.5, letterSpacing: 1, textTransform: 'uppercase' }}>
            Choose Theme
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {themes.map((t) => (
              <Tooltip key={t.key} title={t.label} placement="bottom">
                <Box
                  onClick={() => { setThemeKey(t.key); setPaletteAnchor(null); }}
                  sx={{
                    width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: themeKey === t.key ? '3px solid #fff' : '3px solid transparent',
                    outline: themeKey === t.key ? `2px solid ${t.primary}` : '2px solid transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'scale(1.15)' },
                  }}
                >
                  {themeKey === t.key && <CheckRoundedIcon sx={{ fontSize: 14, color: '#fff' }} />}
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Popover>

        {/* Avatar */}
        <Tooltip title="Account settings">
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
            <Avatar
              sx={{
                width: 36, height: 36,
                background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.secondary})`,
                fontSize: '0.85rem', fontWeight: 700,
              }}
            >
              {getInitials(profile?.username)}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              minWidth: 220,
              borderRadius: '14px',
              border: '1.5px solid rgba(233,30,140,0.12)',
              boxShadow: '0 12px 40px rgba(233,30,140,0.15)',
              overflow: 'hidden',
            },
          }}
        >
          {/* Profile Header */}
          <Box
            sx={{
              px: 2.5, py: 2,
              background: `linear-gradient(135deg, ${activeTheme.primary} 0%, ${activeTheme.secondary} 100%)`,
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}
          >
            <Avatar
              sx={{
                width: 42, height: 42,
                background: 'rgba(255,255,255,0.25)',
                border: '2px solid rgba(255,255,255,0.5)',
                fontSize: '1rem', fontWeight: 800, color: '#fff',
              }}
            >
              {getInitials(profile?.username)}
            </Avatar>
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.2 }} noWrap>
                {profile?.username ? profile.username.charAt(0).toUpperCase() + profile.username.slice(1) : 'User'}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', textTransform: 'capitalize' }}>
                {profile?.role || 'staff'}
              </Typography>
            </Box>
          </Box>

          {/* Menu Items */}
          <Box sx={{ p: 1 }}>
            <MenuItem
              onClick={() => setAnchorEl(null)}
              sx={{
                borderRadius: '8px', py: 1.2, px: 1.5, gap: 1.2,
                '&:hover': { bgcolor: 'rgba(233,30,140,0.07)' },
              }}
            >
              <Box sx={{
                width: 32, height: 32, borderRadius: '8px',
                bgcolor: 'rgba(233,30,140,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <AccountCircleRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              </Box>
              <Typography variant="body2" fontWeight={600}>My Profile</Typography>
            </MenuItem>

            <Divider sx={{ my: 0.5, borderColor: 'rgba(233,30,140,0.1)' }} />

            <MenuItem
              onClick={async () => {
                setAnchorEl(null);
                await signOut();
                navigate('/login', { replace: true });
              }}
              sx={{
                borderRadius: '8px', py: 1.2, px: 1.5, gap: 1.2,
                '&:hover': { bgcolor: 'rgba(239,68,68,0.07)' },
              }}
            >
              <Box sx={{
                width: 32, height: 32, borderRadius: '8px',
                bgcolor: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LogoutRoundedIcon sx={{ fontSize: 18, color: '#EF4444' }} />
              </Box>
              <Typography variant="body2" fontWeight={600} color="error.main">Sign Out</Typography>
            </MenuItem>
          </Box>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
