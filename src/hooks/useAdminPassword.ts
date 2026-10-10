'use client';

import { useRef, useState } from 'react';

// 관리자 비밀번호가 필요한 작업 실행 도우미
// - 비밀번호는 메모리(ref)에만 두고 브라우저 저장소에는 저장하지 않음
// - 맞게 입력하면 이 화면을 떠나기 전까지 다시 묻지 않고, 작업이 실패하면 잊음
export function useAdminPassword() {
    const passwordRef = useRef<string | null>(null);
    const pendingRef = useRef<((password: string) => Promise<void>) | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const run = async (action: (password: string) => Promise<void>, password: string) => {
        try {
            await action(password);
            passwordRef.current = password;
        } catch (err) {
            passwordRef.current = null;
            throw err;
        }
    };

    // action이 던진 오류는 호출한 쪽(onError)으로 전달
    const withPassword = (action: (password: string) => Promise<void>, onError: (err: Error) => void) => {
        if (passwordRef.current) {
            run(action, passwordRef.current).catch(onError);
            return;
        }
        pendingRef.current = (password) => run(action, password).catch(onError);
        setDialogOpen(true);
    };

    const dialogProps = {
        open: dialogOpen,
        onConfirm: (password: string) => {
            setDialogOpen(false);
            pendingRef.current?.(password);
            pendingRef.current = null;
        },
        onCancel: () => {
            setDialogOpen(false);
            pendingRef.current = null;
        },
    };

    return { withPassword, dialogProps };
}
