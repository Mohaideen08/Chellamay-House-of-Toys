import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress, Fade,
} from '@mui/material';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logoHeader from '../assets/Logo-header.png';

const FLOAT_EMOJIS = ['🧸', '🎠', '🎮', '🪀', '🎯', '🎪', '🚂', '🎨'];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // If already logged in (e.g. back button after login), redirect immediately
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    const { error: authError } = await signIn(email.trim(), password);
    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      // signIn() eagerly set user+loading in AuthContext.
      // Navigate now — ProtectedRoute will show its spinner until
      // onAuthStateChange fires, fetchProfile completes, loading→false.
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #1a0533 0%, #5c0a5e 28%, #b5006e 62%, #e91e8c 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Blurred blob decorations */}
      {[
        { w: 520, h: 520, top: '-180px', left: '-180px' },
        { w: 380, h: 380, bottom: '-130px', right: '-100px' },
        { w: 220, h: 220, top: '40%', right: '8%' },
      ].map((blob, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: blob.w,
            height: blob.h,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            top: blob.top,
            bottom: blob.bottom,
            left: blob.left,
            right: blob.right,
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Floating toy emojis */}
      {FLOAT_EMOJIS.map((emoji, i) => (
        <Typography
          key={i}
          component="span"
          sx={{
            position: 'absolute',
            fontSize: i % 3 === 0 ? '2rem' : '1.5rem',
            opacity: 0.2,
            userSelect: 'none',
            pointerEvents: 'none',
            animation: `floatE${i} ${4 + i * 0.5}s ease-in-out ${i * 0.35}s infinite alternate`,
            [`@keyframes floatE${i}`]: {
              from: { transform: 'translateY(0px) rotate(0deg)' },
              to: { transform: `translateY(-${18 + i * 4}px) rotate(${i % 2 === 0 ? 12 : -12}deg)` },
            },
            top: `${7 + i * 11}%`,
            left: i % 2 === 0 ? `${3 + i * 2.5}%` : undefined,
            right: i % 2 !== 0 ? `${4 + i * 2}%` : undefined,
          }}
        >
          {emoji}
        </Typography>
      ))}

      <Fade in timeout={800}>
        <Box sx={{ width: '100%', maxWidth: 460, mx: 2, position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              background: 'rgba(255,255,255,0.98)',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 40px 90px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.25)',
            }}
          >
            {/* ── Gradient banner with logo ── */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #c2185b 0%, #e91e8c 55%, #f06292 100%)',
                pt: 4.5,
                pb: 4,
                px: 4,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  width: 220,
                  height: 220,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.10)',
                  top: -80,
                  right: -70,
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.07)',
                  bottom: -70,
                  left: -50,
                },
              }}
            >
              {/* Logo box */}
              <Box
                sx={{
                  width: 90,
                  height: 90,
                  borderRadius: '22px',
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(12px)',
                  border: '2px solid rgba(255,255,255,0.45)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  boxShadow: '0 10px 36px rgba(0,0,0,0.22)',
                  overflow: 'hidden',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <Box
                  component="img"
                  src={logoHeader}
                  alt="Chellamay logo"
                  sx={{ width: 68, height: 68, objectFit: 'contain' }}
                />
              </Box>

              <Typography
                variant="h4"
                fontWeight={900}
                sx={{
                  color: '#fff',
                  letterSpacing: '-0.5px',
                  textShadow: '0 2px 14px rgba(0,0,0,0.22)',
                  position: 'relative',
                  zIndex: 1,
                  lineHeight: 1.1,
                }}
              >
                Chellamay
              </Typography>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.88)',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  mt: 0.5,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                House of Toys
              </Typography>
            </Box>

            {/* ── Form section ── */}
            <Box sx={{ px: { xs: 3, sm: 4.5 }, pt: 3.5, pb: 4.5 }}>
              <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ mb: 0.4 }}>
                Welcome back 👋
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
                Sign in to manage billing &amp; inventory
              </Typography>

              {error && (
                <Alert
                  severity="error"
                  sx={{ mb: 2.5, borderRadius: '10px' }}
                  onClose={() => setError('')}
                >
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} noValidate>
                {/* Email */}
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ mb: 0.8, display: 'block', color: '#555', letterSpacing: 0.6, textTransform: 'uppercase', fontSize: '0.7rem' }}
                >
                  Email Address
                </Typography>
                <TextField
                  fullWidth
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      background: '#f8f8fb',
                      '&:hover fieldset': { bordercolor: 'primary.main' },
                      '&.Mui-focused fieldset': { bordercolor: 'primary.main', borderWidth: '2px' },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailRoundedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Password */}
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ mb: 0.8, display: 'block', color: '#555', letterSpacing: 0.6, textTransform: 'uppercase', fontSize: '0.7rem' }}
                >
                  Password
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{
                    mb: 3.5,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      background: '#f8f8fb',
                      '&:hover fieldset': { bordercolor: 'primary.main' },
                      '&.Mui-focused fieldset': { bordercolor: 'primary.main', borderWidth: '2px' },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockRoundedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                          sx={{ color: 'primary.main' }}
                        >
                          {showPassword
                            ? <VisibilityOffRoundedIcon fontSize="small" />
                            : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.65,
                    fontSize: '1rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #c2185b 0%, #e91e8c 100%)',
                    boxShadow: '0 10px 30px rgba(var(--color-primary-rgb),0.42)',
                    letterSpacing: 0.4,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #ad1457 0%, #d81b60 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 16px 40px rgba(var(--color-primary-rgb),0.55)',
                    },
                    '&:active': { transform: 'translateY(0)' },
                    transition: 'all 0.25s ease',
                  }}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign In'}
                </Button>
              </Box>

              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ mt: 3, display: 'block', textAlign: 'center', fontSize: '0.7rem' }}
              >
                Chellamay House of Toys · Billing &amp; Inventory
              </Typography>
            </Box>
          </Box>
        </Box>
      </Fade>
    </Box>
  );
};

export default LoginPage;
