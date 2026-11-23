import { NextResponse } from 'next/server';

import { GmailConfigurationError, GmailDeliveryError } from '@/lib/email/gmail';
import { authRegisterService } from '@/lib/services/auth-register-service'
import {
  TurnstileConfigurationError,
  verifyTurnstileToken,
} from '@/lib/turnstile';

export async function POST(req: Request) {
  try {
    const payload: unknown = await req.json();
    const turnstileToken =
      typeof payload === 'object' &&
      payload !== null &&
      'turnstileToken' in payload &&
      typeof payload.turnstileToken === 'string'
        ? payload.turnstileToken
        : '';

    if (!turnstileToken) {
      return NextResponse.json(
        { error: 'Completa la verificación de seguridad' },
        { status: 400 },
      );
    }

    if (!(await verifyTurnstileToken(turnstileToken, 'register'))) {
      return NextResponse.json(
        { error: 'La verificación de seguridad expiró o no es válida' },
        { status: 400 },
      );
    }

    const result = await authRegisterService.register(payload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    console.error('Error en registro:', error);
    if (error instanceof TurnstileConfigurationError) {
      return NextResponse.json(
        { error: 'La verificación de seguridad no está configurada' },
        { status: 503 },
      );
    }
    if (error instanceof GmailConfigurationError) {
      return NextResponse.json(
        { error: 'El envío de correo no está configurado. Contacta al administrador.' },
        { status: 503 },
      );
    }
    if (error instanceof GmailDeliveryError) {
      return NextResponse.json(
        { error: 'No se pudo enviar el correo de verificación. Intenta registrarte nuevamente.' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 },
    );
  }
}
