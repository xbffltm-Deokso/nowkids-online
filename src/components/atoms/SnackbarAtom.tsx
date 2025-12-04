import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface SnackbarAtomProps {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
}

export default function SnackbarAtom({ open, message, severity, onClose }: SnackbarAtomProps) {
    return (
        <Snackbar
            open={open}
            autoHideDuration={3000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
                {message}
            </Alert>
        </Snackbar>
    );
}
