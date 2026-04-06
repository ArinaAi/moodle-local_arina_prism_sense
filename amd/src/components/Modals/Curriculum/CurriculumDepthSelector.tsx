import React from 'react';
import {
  Paper,
  FormControl,
  Tooltip,
  FormLabel,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
} from '@mui/material';

export interface CurriculumDepthSelectorProps {
  videoLength: string;
  setVideoLength: (val: string) => void;
  hasInsufficientCredits: boolean;
  requiredCredits: number;
  availableBalance: number;
}

export const CurriculumDepthSelector: React.FC<CurriculumDepthSelectorProps> = ({
  videoLength,
  setVideoLength,
  hasInsufficientCredits,
  requiredCredits,
  availableBalance,
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 'clamp(16px, 2vw + 12px, 24px)',
        borderRadius: '12px',
        bgcolor: 'white',
        border: '2px solid #e9ecef',
        transition: 'all 0.3s ease',
        mb: 2.5,
        '&:hover': {
          borderColor: '#0f6cbf',
          boxShadow: '0 4px 12px rgba(15, 108, 191, 0.15)',
        },
      }}
    >
      <FormControl component="fieldset" fullWidth>
        <Tooltip
          title="Determines the depth and detail level for the generated presentation"
          arrow
          placement="top"
          PopperProps={{
            sx: {
              zIndex: 100002,
            },
          }}
        >
          <FormLabel
            component="legend"
            sx={{
              mb: 'clamp(8px, 1.5vw + 4px, 12px)',
              '&.Mui-focused': {
                color: '#1a1a1a',
              },
              cursor: 'help',
              width: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                Presentation Depth
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Video duration scales with slide count.
            </Typography>
          </FormLabel>
        </Tooltip>
        <RadioGroup
          value={videoLength}
          onChange={(e) => setVideoLength(e.target.value)}
        >
          <FormControlLabel
            value="5"
            control={<Radio />}
            label={
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Express (~15m)
                  </Typography>
                  <Chip
                    label="6 Credits"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(15, 108, 191, 0.1)',
                      color: '#0f6cbf',
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      height: '18px',
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Quick summary or intro.
                </Typography>
              </Box>
            }
            sx={{ mb: 1.5, ml: 0, alignItems: 'flex-start' }}
          />
          <FormControlLabel
            value="15"
            control={<Radio />}
            label={
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Standard (~30m)
                  </Typography>
                  <Chip
                    label="8 Credits"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(15, 108, 191, 0.1)',
                      color: '#0f6cbf',
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      height: '18px',
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Complete general overview.
                </Typography>
              </Box>
            }
            sx={{ mb: 1.5, ml: 0, alignItems: 'flex-start' }}
          />
          <FormControlLabel
            value="30"
            control={<Radio />}
            label={
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Extensive (~45m)
                  </Typography>
                  <Chip
                    label="Recommended"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(46, 125, 50, 0.1)',
                      color: '#2e7d32',
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      height: '18px',
                    }}
                  />
                  <Chip
                    label="10 Credits"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(15, 108, 191, 0.1)',
                      color: '#0f6cbf',
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      height: '18px',
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  In-depth analysis.
                </Typography>
              </Box>
            }
            sx={{ mb: 1.5, ml: 0, alignItems: 'flex-start' }}
          />
        </RadioGroup>
      </FormControl>

      {/* Insufficient credits warning — shown inside the depth card */}
      {hasInsufficientCredits && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            mt: 1.5,
            p: 1.5,
            borderRadius: '8px',
            bgcolor: 'rgba(249, 115, 22, 0.08)',
            border: '1px solid rgba(249, 115, 22, 0.3)',
          }}
        >
          <Box
            component="span"
            sx={{
              mt: '2px',
              flexShrink: 0,
              width: 16,
              height: 16,
              borderRadius: '50%',
              bgcolor: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              color: 'white',
            }}
          >
            !
          </Box>
          <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 500, lineHeight: 1.5 }}>
            You need <strong>{requiredCredits} credits</strong> for this option, but you only have{' '}
            <strong>
              {Math.floor(availableBalance)} credit{Math.floor(availableBalance) !== 1 ? 's' : ''}
            </strong>{' '}
            available. Please choose a lower depth or contact your admin.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
