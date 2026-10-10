'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

interface PasswordDialogProps {
    open: boolean;
    title: string;
    message: string;
    onConfirm: (password: string) => void;
    onCancel: () => void;
}

// 관리자 비밀번호 입력 창 (출석 기록 삭제처럼 되돌릴 수 없는 작업 전에 사용)
export default function PasswordDialog({ open, title, message, onConfirm, onCancel }: PasswordDialogProps) {
    const [password, setPassword] = useState('');

    const close = (confirmed: boolean) => {
        if (confirmed) onConfirm(password);
        else onCancel();
        setPassword('');
    };

    return (
        <Dialog open={open} onClose={() => close(false)} maxWidth="xs" fullWidth>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (password) close(true);
                }}
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>{message}</DialogContentText>
                    <TextField
                        autoFocus
                        fullWidth
                        type="password"
                        label="관리자 비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => close(false)}>취소</Button>
                    <Button type="submit" variant="contained" disabled={!password}>
                        확인
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
