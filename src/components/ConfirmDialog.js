import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, Box, Typography,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

const ConfirmDialog = ({
  open,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  severity = 'error',
}) => {
  const colorMap = { error: '#EF4444', warning: '#F59E0B', info: '#3B82F6' };
  const color = colorMap[severity] ?? colorMap.error;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: `${color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <WarningAmberRoundedIcon sx={{ color, fontSize: 24 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ color: 'text.primary', fontSize: '0.95rem', ml: 7 }}>
          {message}
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
        <Button variant="outlined" onClick={onCancel} sx={{ flex: 1, borderRadius: 8 }}>
          {cancelText}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          sx={{
            flex: 1,
            borderRadius: 8,
            background: color,
            '&:hover': { background: color, filter: 'brightness(0.9)' },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
