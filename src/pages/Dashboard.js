import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Skeleton,
  Chip, Avatar, Stack,
} from '@mui/material';
import { keyframes } from '@mui/system';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import LocalMallRoundedIcon from '@mui/icons-material/LocalMallRounded';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

// ── Animations ────────────────────────────────────────────────────────────────
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
`;

const slideRight = keyframes`
  from { opacity: 0; transform: translateX(-24px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33%       { transform: translateY(-8px) rotate(2deg); }
  66%       { transform: translateY(-4px) rotate(-1deg); }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// eslint-disable-next-line no-unused-vars
const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb),0); }
  50%       { box-shadow: 0 0 0 8px rgba(var(--color-primary-rgb),0.12); }
`;

const rotateSlow = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const expandWidth = keyframes`
  from { width: 0%; }
  to   { width: 100%; }
`;

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, gradient, glowColor, subtitle, loading, delay = 0 }) => (
  <Card
    elevation={0}
    sx={{
      height: '100%',
      borderRadius: '20px',
      overflow: 'hidden',
      position: 'relative',
      background: gradient,
      animation: `${fadeUp} 0.6s cubic-bezier(0.34,1.56,0.64,1) both`,
      animationDelay: `${delay}ms`,
      transition: 'transform 0.30s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.30s ease',
      boxShadow: `0 10px 30px ${glowColor}`,
      cursor: 'default',
      '&:hover': {
        transform: 'translateY(-8px) scale(1.02)',
        boxShadow: `0 24px 56px ${glowColor}`,
        '& .card-shine': { left: '130%' },
        '& .card-icon-bg': { transform: 'scale(1.12) rotate(8deg)', opacity: 0.22 },
        '& .card-icon-box': { transform: 'scale(1.1) rotate(-6deg)' },
      },
    }}
  >
    {/* Big background icon */}
    <Box
      className="card-icon-bg"
      sx={{
        position: 'absolute',
        right: -10,
        bottom: -10,
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.35s ease, opacity 0.35s ease',
        opacity: 0.16,
      }}
    >
      <Icon sx={{ fontSize: 30, color: '#fff' }} />
    </Box>

    {/* Shine sweep */}
    <Box
      className="card-shine"
      sx={{
        position: 'absolute',
        top: 0,
        left: '-60%',
        width: '50%',
        height: '100%',
        background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)',
        transform: 'skewX(-15deg)',
        transition: 'left 0.55s ease',
        pointerEvents: 'none',
      }}
    />

    {/* Decorative bubble top-left */}
    <Box
      sx={{
        position: 'absolute',
        top: -20,
        left: -20,
        width: 70,
        height: 70,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        pointerEvents: 'none',
      }}
    />

    <CardContent sx={{ p: 1.2, pl: '18px', position: 'relative', zIndex: 1 }}>
      {/* Icon box + title row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
        <Box
          className="card-icon-box"
          sx={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.22)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255,255,255,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'transform 0.30s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <Icon sx={{ fontSize: 14, color: '#fff' }} />
        </Box>

        {/* Trend badge */}
        <Box
          sx={{
            px: 0.8,
            py: 0.2,
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.28)',
          }}
        >
          <Typography sx={{ color: '#fff', fontSize: '0.46rem', fontWeight: 700, letterSpacing: 0.4 }}>
            TODAY
          </Typography>
        </Box>
      </Box>

      {/* Value */}
      {loading ? (
        <Skeleton variant="text" width={55} height={24} sx={{ borderRadius: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />
      ) : (
        <Typography
          fontWeight={900}
          sx={{
            color: '#fff',
            lineHeight: 1.1,
            fontSize: { xs: '1rem', sm: '1.15rem' },
            letterSpacing: '-0.5px',
            textShadow: '0 2px 8px rgba(0,0,0,0.15)',
            mb: 0.2,
          }}
        >
          {value}
        </Typography>
      )}

      {/* Title */}
      <Typography
        sx={{
          color: 'rgba(255,255,255,0.82)',
          fontWeight: 700,
          fontSize: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          mb: 0.1,
        }}
      >
        {title}
      </Typography>

      {/* Subtitle */}
      {subtitle && (
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.5rem', fontWeight: 500 }}>
          {subtitle}
        </Typography>
      )}

      {/* Bottom bar */}
      {!loading && (
        <Box sx={{ mt: 0.8 }}>
          <Box sx={{ height: 2, borderRadius: 10, bgcolor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
            <Box
              sx={{
                height: '100%',
                background: 'rgba(255,255,255,0.65)',
                borderRadius: 10,
                animation: `${expandWidth} 1.4s cubic-bezier(0.4,0,0.2,1) both`,
                animationDelay: `${delay + 300}ms`,
                width: '100%',
              }}
            />
          </Box>
        </Box>
      )}
    </CardContent>
  </Card>
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ products: 0, todaySales: 0, todayRevenue: 0 });
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(dayjs());

  const hour = currentTime.hour();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const greetEmoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙';

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(dayjs()), 60000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const today = dayjs().format('YYYY-MM-DD');

        let branchId = null;
        if (profile?.branchName) {
          const { data: br } = await supabase.from('branches').select('id').eq('name', profile.branchName).single();
          if (br) branchId = br.id;
        }

        let salesCountQuery = supabase.from('sales').select('*', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`);
        let salesRevenueQuery = supabase.from('sales').select('net_amount').gte('created_at', `${today}T00:00:00`);
        let recentQuery = supabase.from('sales').select('id, bill_number, net_amount, created_at').order('created_at', { ascending: false }).limit(6);

        if (branchId) {
          salesCountQuery = salesCountQuery.eq('branch_id', branchId);
          salesRevenueQuery = salesRevenueQuery.eq('branch_id', branchId);
          recentQuery = recentQuery.eq('branch_id', branchId);
        }

        const [
          { count: products },
          { count: todaySales },
          { data: salesData },
          { data: recent },
        ] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }),
          salesCountQuery,
          salesRevenueQuery,
          recentQuery,
        ]);
        const todayRevenue = salesData?.reduce((s, r) => s + (r.net_amount || 0), 0) ?? 0;
        setStats({ products: products ?? 0, todaySales: todaySales ?? 0, todayRevenue });
        setRecentSales(recent ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [profile]);

  const fmtCurrency = (n) =>
    `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const STATS = [
    {
      title: 'Total Products',
      value: stats.products.toLocaleString(),
      icon: Inventory2RoundedIcon,
      gradient: 'linear-gradient(135deg,#E91E8C,#F06292)',
      glowColor: 'rgba(var(--color-primary-rgb),0.28)',
      subtitle: 'items in inventory',
      delay: 120,
    },
    {
      title: "Today's Bills",
      value: stats.todaySales.toLocaleString(),
      icon: ReceiptRoundedIcon,
      gradient: 'linear-gradient(135deg,#2563EB,#818CF8)',
      glowColor: 'rgba(37,99,235,0.28)',
      subtitle: 'transactions today',
      delay: 240,
    },
    {
      title: "Today's Revenue",
      value: fmtCurrency(stats.todayRevenue),
      icon: CurrencyRupeeRoundedIcon,
      gradient: 'linear-gradient(135deg,#059669,#34D399)',
      glowColor: 'rgba(5,150,105,0.28)',
      subtitle: 'earned today',
      delay: 360,
    },
  ];

  const dayProgress = ((hour * 60 + currentTime.minute()) / 1440) * 100;

  return (
    <Box sx={{ animation: `${fadeIn} 0.3s ease both` }}>

      {/* ── Hero Greeting Banner ─────────────────────────────────────────── */}
      <Box
        sx={{
          mb: { xs: 2.5, md: 3.5 },
          borderRadius: { xs: 3, sm: 4 },
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(135deg, #0F0C29 0%, #24243e 40%, #302b63 75%, #3a1c71 100%)',
          p: { xs: 2.5, sm: 3, md: 3.5 },
          boxShadow: '0 20px 60px rgba(15,23,42,0.35), 0 4px 20px rgba(var(--color-primary-rgb),0.15)',
          animation: `${slideRight} 0.5s cubic-bezier(0.34,1.56,0.64,1) both`,
        }}
      >
        {/* Decorative orbs */}
        <Box sx={{
          position: 'absolute', top: -50, right: -50, width: 220, height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--color-primary-rgb),0.25) 0%, transparent 70%)',
          pointerEvents: 'none', animation: `${rotateSlow} 20s linear infinite`,
        }} />
        <Box sx={{
          position: 'absolute', bottom: -40, left: '20%', width: 160, height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', top: '20%', right: '25%', width: 90, height: 90,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', bottom: 10, right: 20, width: 60, height: 60,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Shimmer line */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: `${shimmer} 4s linear infinite`,
          pointerEvents: 'none',
        }} />

        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Box
                sx={{
                  fontSize: { xs: '1.3rem', sm: '1.6rem' },
                  animation: `${float} 4s ease-in-out infinite`,
                  display: 'inline-block',
                  lineHeight: 1,
                }}
              >
                {greetEmoji}
              </Box>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.05rem', sm: '1.35rem', md: '1.5rem' },
                  color: '#fff',
                  letterSpacing: '-0.3px',
                  lineHeight: 1.25,
                }}
              >
                {greeting},{' '}
                <Box
                  component="span"
                  sx={{
                    background: 'linear-gradient(90deg, #F472B6, #A78BFA, #60A5FA)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: `${shimmer} 3s linear infinite`,
                  }}
                >
                  {profile?.username ? profile.username.charAt(0).toUpperCase() + profile.username.slice(1) : 'User'}!
                </Box>
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                mt: 0.3,
                fontSize: { xs: '0.68rem', sm: '0.78rem' },
                fontWeight: 500,
              }}
            >
              {dayjs().format('dddd, MMMM D, YYYY')} · Here's your store overview
            </Typography>
          </Box>

          {/* Store brand chip */}
          <Chip
            icon={
              <LocalMallRoundedIcon sx={{ fontSize: '0.85rem !important', color: '#F472B6 !important' }} />
            }
            label="Chellamay Toys"
            sx={{
              bgcolor: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.14)',
              fontSize: '0.65rem',
              height: 26,
              backdropFilter: 'blur(12px)',
              '& .MuiChip-label': { px: 1 },
              '& .MuiChip-icon': { ml: '6px' },
              boxShadow: '0 2px 12px rgba(244,114,182,0.2)',
            }}
          />
        </Box>

        {/* Day progress bar */}
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <Box sx={{
            height: 3, position: 'relative',
            bgcolor: 'rgba(255,255,255,0.07)',
            overflow: 'hidden',
          }}>
            <Box sx={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: `${dayProgress}%`,
              background: 'linear-gradient(90deg, #E91E8C, #7C3AED, #2563EB, #34D399)',
              backgroundSize: '200% 100%',
              animation: `${shimmer} 3s linear infinite`,
              transition: 'width 1s ease',
            }} />
          </Box>
        </Box>
      </Box>


      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: { xs: 1.5, sm: 2, md: 2.5 },
          mb: { xs: 2.5, md: 3.5 },
        }}
      >
        {STATS.map((s, i) => (
          <StatCard key={i} {...s} loading={loading} />
        ))}
      </Box>

      {/* ── Recent Transactions ──────────────────────────────────────────── */}
      <Card
        elevation={0}
        sx={{
          borderRadius: { xs: 3, sm: 4 },
          border: '1.5px solid',
          borderColor: 'rgba(0,0,0,0.06)',
          overflow: 'hidden',
          animation: `${fadeUp} 0.6s cubic-bezier(0.34,1.56,0.64,1) both`,
          animationDelay: '440ms',
          background: '#fff',
          boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
          transition: 'box-shadow 0.28s ease',
          '&:hover': { boxShadow: '0 8px 40px rgba(15,23,42,0.1)' },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: '1.5px solid',
            borderColor: 'rgba(0,0,0,0.05)',
            background: 'linear-gradient(135deg, #F8F4FF 0%, #FDF0F9 50%, #F0F7FF 100%)',
          }}
        >
          <Box
            sx={{
              width: { xs: 34, sm: 40 }, height: { xs: 34, sm: 40 }, borderRadius: { xs: 2, sm: 2.5 },
              background: 'linear-gradient(135deg,#E91E8C,#7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(var(--color-primary-rgb),0.35)',
              flexShrink: 0,
            }}
          >
            <TrendingUpRoundedIcon sx={{ fontSize: { xs: 16, sm: 19 }, color: '#fff' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{ lineHeight: 1.2, fontSize: { xs: '0.85rem', sm: '1rem' } }}
            >
              Recent Transactions
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 500 }}>
              Latest 6 bills · live
            </Typography>
          </Box>
          <Chip
            label={`${recentSales.length} records`}
            size="small"
            sx={{
              bgcolor: '#F3E8FF', color: 'secondary.main', fontWeight: 700,
              fontSize: '0.6rem', height: 22, border: '1px solid #DDD6FE',
              '& .MuiChip-label': { px: 0.9 },
            }}
          />
        </Box>

        {/* Body */}
        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }}>
          {loading ? (
            <Stack spacing={1.5}>
              {[...Array(4)].map((_, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: 2.5, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="50%" height={16} />
                    <Skeleton variant="text" width="30%" height={13} sx={{ mt: 0.4 }} />
                  </Box>
                  <Skeleton variant="rounded" width={75} height={28} sx={{ borderRadius: 2 }} />
                </Box>
              ))}
            </Stack>
          ) : recentSales.length === 0 ? (
            <Box
              sx={{
                py: { xs: 5, md: 6 }, textAlign: 'center',
                animation: `${scaleIn} 0.45s cubic-bezier(0.34,1.56,0.64,1) both`,
              }}
            >
              <Box
                sx={{
                  fontSize: { xs: '2.8rem', sm: '3.4rem' },
                  mb: 1.5,
                  animation: `${float} 3s ease-in-out infinite`,
                  display: 'inline-block',
                }}
              >
                🧾
              </Box>
              <Typography variant="h6" fontWeight={700} color="text.secondary" mb={0.5} sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                No transactions yet
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                Bills created today will appear here
              </Typography>
            </Box>
          ) : (
            <Stack spacing={0.5}>
              {recentSales.map((sale, idx) => {
                const hue = (idx * 55 + 300) % 360;
                return (
                  <Box
                    key={sale.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: { xs: 1, sm: 1.4 },
                      borderRadius: '10px',
                      gap: { xs: 1, sm: 1.5 },
                      animation: `${fadeUp} 0.45s cubic-bezier(0.34,1.56,0.64,1) both`,
                      animationDelay: `${520 + idx * 70}ms`,
                      transition: 'background 0.18s ease, transform 0.18s ease',
                      cursor: 'default',
                      border: '1px solid transparent',
                      '&:hover': {
                        bgcolor: `hsla(${hue},70%,96%,0.7)`,
                        borderColor: `hsla(${hue},60%,85%,0.5)`,
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0, flex: 1 }}>
                      <Avatar
                        sx={{
                          width: { xs: 36, sm: 44 },
                          height: { xs: 36, sm: 44 },
                          borderRadius: { xs: 2, sm: 2.5 },
                          background: `linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue + 40) % 360},65%,65%))`,
                          fontSize: { xs: '0.6rem', sm: '0.68rem' },
                          fontWeight: 800,
                          color: '#fff',
                          flexShrink: 0,
                          boxShadow: `0 4px 14px hsla(${hue},60%,50%,0.4)`,
                          border: `2px solid hsla(${hue},60%,80%,0.4)`,
                        }}
                      >
                        {sale.bill_number?.slice(-3)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          noWrap
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.84rem' } }}
                        >
                          Bill #{sale.bill_number}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: '0.62rem', fontWeight: 500 }}
                        >
                          {dayjs(sale.created_at).format('DD MMM · hh:mm A')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        sx={{
                          fontSize: { xs: '0.78rem', sm: '0.88rem' },
                          background: 'linear-gradient(135deg,#059669,#10B981)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {fmtCurrency(sale.net_amount ?? 0)}
                      </Typography>
                      <Chip
                        label="Paid"
                        size="small"
                        sx={{
                          height: 17, fontSize: '0.55rem', fontWeight: 700,
                          bgcolor: '#DCFCE7', color: '#16A34A',
                          border: '1px solid #BBF7D0',
                          '& .MuiChip-label': { px: 0.8 },
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
