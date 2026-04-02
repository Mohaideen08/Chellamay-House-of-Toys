import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import logo from '../assets/Logo.png';

const pulse = keyframes`
  0%   { opacity: 0.6; transform: scale(0.97); }
  50%  { opacity: 1;   transform: scale(1.03); }
  100% { opacity: 0.6; transform: scale(0.97); }
`;

const dotBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0);   opacity: 0.4; }
  40%            { transform: translateY(-8px); opacity: 1;   }
`;

const SplashScreen = () => (
  <Box
    sx={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      // blurred background
      backdropFilter: 'blur(18px)',
      backgroundColor: 'rgba(255,255,255,0.72)',
    }}
  >
    {/* Logo */}
    <Box
      sx={{
        animation: `${pulse} 1.8s ease-in-out infinite`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 100,
          height: 100,
          borderRadius: 4,
          background: '#fff',
          boxShadow: '0 8px 40px rgba(233,30,140,0.18), 0 2px 12px rgba(0,0,0,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={logo}
          alt="Chellamay Toys"
          style={{
            width: 86,
            height: 86,
            objectFit: 'contain',
            filter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(300deg) brightness(0.85)',
          }}
        />
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '1.35rem',
            letterSpacing: '-0.5px',
            color: '#111',
            lineHeight: 1.2,
          }}
        >
          Chellamay Toys
        </Typography>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '0.7rem',
            color: '#E91E8C',
            textTransform: 'uppercase',
            letterSpacing: 2,
            mt: 0.3,
          }}
        >
          House of Toys
        </Typography>
      </Box>
    </Box>

    {/* Loading dots */}
    <Box sx={{ display: 'flex', gap: 1 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: '#E91E8C',
            animation: `${dotBounce} 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </Box>

    <Typography variant="caption" sx={{ color: 'text.disabled', letterSpacing: 0.5 }}>
      Loading, please wait…
    </Typography>
  </Box>
);

export default SplashScreen;
