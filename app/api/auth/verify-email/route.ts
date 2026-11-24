import { NextResponse } from 'next/server';

import { emailVerificationService } from '@/lib/services/email-verification-service';

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const token =
      typeof payload === 'object' &&
      payload !== null &&
      'token' in payload &&
      typeof payload.token === 'string'
        ? payload.token
        : null;

    const result = await emailVerificationService.verify(token);

    if (!result.success) {
      return NextResponse.json(
        { error: 'El enlace de verificación no es válido o ya venció.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      role: result.role,
      aprobado: result.aprobado,
    });
  } catch (error) {
    console.error('Error verificando correo:', error);
    return NextResponse.json(
      { error: 'No se pudo verificar el correo. Intenta nuevamente.' },
      { status: 500 },
    );
  }
}
