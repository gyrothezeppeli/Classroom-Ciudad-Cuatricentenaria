import nodemailer from 'nodemailer';

export class GmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GmailConfigurationError';
  }
}

export class GmailDeliveryError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('Gmail no pudo enviar el mensaje de verificación.');
    this.name = 'GmailDeliveryError';
    this.cause = cause;
  }
}

function getVerificationUrl(token: string): string {
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined);

  if (!baseUrl) {
    throw new GmailConfigurationError('NEXTAUTH_URL no está configurado.');
  }

  let url: URL;
  try {
    url = new URL(
      `/verificar-correo?token=${encodeURIComponent(token)}`,
      baseUrl,
    );
  } catch {
    throw new GmailConfigurationError('NEXTAUTH_URL no es una URL válida.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new GmailConfigurationError('NEXTAUTH_URL debe usar HTTP o HTTPS.');
  }
  return url.toString();
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!user || !appPassword) {
    throw new GmailConfigurationError(
      'Configura GMAIL_USER y GMAIL_APP_PASSWORD para enviar correos.',
    );
  }

  const verificationUrl = getVerificationUrl(token);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: appPassword.replace(/\s/g, ''),
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_FROM || `Classroom <${user}>`,
      to,
      subject: 'Verifica tu correo electrónico - Classroom',
      text: [
        'Gracias por registrarte en Classroom.',
        'Confirma tu correo abriendo este enlace:',
        verificationUrl,
        'El enlace vence en 24 horas.',
      ].join('\n\n'),
      html: `
        <p>Gracias por registrarte en Classroom.</p>
        <p>Confirma tu correo electrónico haciendo clic en el siguiente enlace:</p>
        <p><a href="${verificationUrl}">Verificar correo electrónico</a></p>
        <p>Este enlace vence en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
      `,
    });
  } catch (error) {
    throw new GmailDeliveryError(error);
  }
}
