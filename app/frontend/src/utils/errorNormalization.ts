/**
 * Maps technical API errors to user-friendly explanations and next actions.
 */
export const normalizeError = (error: any): { message: string, action: string } => {
  const status = error.response?.status;
  const detail = error.response?.data?.detail || '';
  const text = error.message || '';

  if (status === 401) {
    if (detail.toLowerCase().includes('timestamp') || text.toLowerCase().includes('timestamp')) {
      return {
        message: 'Clock drift detected.',
        action: 'Your system clock is out of sync with Delta. Resyncing...'
      };
    }
    return {
      message: 'Invalid API Keys.',
      action: 'Check your DELTA_API_KEY and SECRET in .env'
    };
  }

  if (status === 403) {
    return {
      message: 'Insufficient Permissions.',
      action: 'This key doesn\'t have permission for this action.'
    };
  }

  if (status === 429) {
    return {
      message: 'Rate Limit Exceeded.',
      action: 'Too many requests. Retrying in a few seconds...'
    };
  }

  if (status >= 500) {
    return {
      message: 'Delta Exchange Offline.',
      action: 'Upstream API is experiencing issues. Please wait.'
    };
  }

  if (text.includes('Network Error')) {
    return {
      message: 'Backend Offline.',
      action: 'Ensure your local FastAPI server is running.'
    };
  }

  return {
    message: 'Unknown Error Occurred.',
    action: 'Check logs for details.'
  };
};
