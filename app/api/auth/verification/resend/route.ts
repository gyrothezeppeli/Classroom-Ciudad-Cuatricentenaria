import { NextResponse } from 'next/server';

import { GmailConfigurationError, GmailDeliveryError } from '@/lib/email/gmail';
import { emailVerificationService } from '@/lib/services/email-verification-service';

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const email =
      typeof payload === 'object' &&
      payload !== null &&
      'email' in payload &&
      typeof payload.email === 'string'
        ? payload.email.trim()
        : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Ingresa un correo válido.' }, { status: 400 });
    }

    await emailVerificationService.resend(email);
    return NextResponse.json({
      success: true,
      message: 'Si la cuenta necesita verificación, recibirás un nuevo correo.',
    });
  } catch (error) {
    console.error('Error reenviando verificación de correo:', error);
    if (error instanceof GmailConfigurationError || error instanceof GmailDeliveryError) {
      return NextResponse.json(
        { error: 'No se pudo enviar el correo. Intenta nuevamente más tarde.' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: 'No se pudo reenviar el correo de verificación.' },
      { status: 500 },
    );
  }
}
