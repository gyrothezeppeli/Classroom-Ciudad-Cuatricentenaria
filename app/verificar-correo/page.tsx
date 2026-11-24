'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';

type VerificationState = 'checking' | 'sent' | 'verified' | 'invalid' | 'error';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerificationMessage message="Cargando..." />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerificationState>(token ? 'checking' : 'sent');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [verifiedRole, setVerifiedRole] = useState<string>('');
  const [verifiedAprobado, setVerifiedAprobado] = useState<boolean | undefined>();
  const verificationStarted = useRef(false);

  useEffect(() => {
    if (!token || verificationStarted.current) return;
    verificationStarted.current = true;

    const verify = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const result = await response.json() as { role?: string; aprobado?: boolean };
          setVerifiedRole(result.role || '');
          setVerifiedAprobado(result.aprobado);
          setState('verified');
        } else {
          setState('invalid');
        }
      } catch (error) {
        console.error('Error verificando correo desde la página:', error);
        setState('error');
      }
    };

    void verify();
  }, [token]);

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResending(true);
    setResendMessage('');
    setResendError('');

    try {
      const response = await fetch('/api/auth/verification/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setResendError(result.error || 'No se pudo reenviar el correo.');
        return;
      }

      setResendMessage(
        `${result.message || 'Solicitud procesada'} Espera al menos un minuto antes de solicitar otro.`,
      );
    } catch (error) {
      console.error('Error solicitando reenvío del correo:', error);
      setResendError('No se pudo reenviar el correo. Intenta nuevamente.');
    } finally {
      setResending(false);
    }
  };

  const messages: Record<VerificationState, string> = {
    checking: 'Estamos validando tu enlace...',
    sent: 'Te enviamos un enlace de verificación. Revisa tu bandeja de entrada y spam.',
    verified: verifiedRole === 'ESTUDIANTE' && verifiedAprobado === false
      ? 'Tu correo quedó verificado. La solicitud quedó pendiente de aprobación por Control de Estudios.'
      : 'Tu correo quedó verificado. Ya puedes iniciar sesión.',
    invalid: 'El enlace no es válido o venció. Puedes solicitar uno nuevo.',
    error: 'Ocurrió un problema al verificar el correo. Intenta nuevamente.',
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="liquid-login-card w-full max-w-lg rounded-[40px] p-8 text-center sm:p-10">
        <div className="liquid-login-content">
          <h1 className="mb-4 text-2xl font-bold">Verificación de correo</h1>
          <p className="mb-6 text-muted-foreground">{messages[state]}</p>

          {state !== 'verified' && state !== 'checking' && (
            <form onSubmit={handleResend} className="mb-6 space-y-3 text-left">
              <label htmlFor="verification-email" className="block text-sm text-foreground">
                Correo electrónico
              </label>
              <input
                id="verification-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-border bg-white/5 px-4 py-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={resending}
                className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? 'Enviando...' : 'Reenviar verificación'}
              </button>
              {resendMessage && <p className="text-sm text-emerald-300">{resendMessage}</p>}
              {resendError && <p role="alert" className="text-sm text-red-300">{resendError}</p>}
            </form>
          )}

          <Link href="/" className="text-sm font-semibold text-primary hover:brightness-125">
            Volver al inicio de sesión
          </Link>
        </div>
      </section>
    </main>
  );
}

function VerificationMessage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <p className="text-muted-foreground">{message}</p>
    </main>
  );
}
