import { Role, type PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email/gmail';
import { createEmailVerificationToken } from '@/lib/services/email-verification-service';

interface RegistrationPayload {
  email: string;
  password: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  cedulaIdentidad?: string;
  role?: string;
  especialidad?: string;
  nivel?: string;
  grado?: string;
  seccion?: string;
}

interface RegisteredUser {
  id: string;
  email: string;
  nombre: string;
  role: Role;
}

export type RegistrationResult =
  | { success: true; message: string; user: RegisteredUser }
  | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalString(
  payload: Record<string, unknown>,
  field: keyof RegistrationPayload,
): string | undefined {
  const value = payload[field];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new TypeError(`Invalid registration field: ${field}`);
  return value;
}

function parsePayload(value: unknown): RegistrationPayload | null {
  if (!isRecord(value)) return null;

  const { email, password, nombre } = value;
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof nombre !== 'string' ||
    !email ||
    !password ||
    !nombre
  ) {
    return null;
  }

  const optionalFields = [
    'apellido',
    'telefono',
    'cedulaIdentidad',
    'role',
    'especialidad',
    'nivel',
    'grado',
    'seccion',
  ] as const;
  if (
    optionalFields.some((field) => {
      const fieldValue = value[field];
      return fieldValue !== undefined
        && fieldValue !== null
        && fieldValue !== ''
        && typeof fieldValue !== 'string';
    })
  ) {
    return null;
  }

  return {
    email: email.trim().toLowerCase(),
    password,
    nombre,
    apellido: readOptionalString(value, 'apellido'),
    telefono: readOptionalString(value, 'telefono'),
    cedulaIdentidad: readOptionalString(value, 'cedulaIdentidad'),
    role: readOptionalString(value, 'role'),
    especialidad: readOptionalString(value, 'especialidad'),
    nivel: readOptionalString(value, 'nivel'),
    grado: readOptionalString(value, 'grado'),
    seccion: readOptionalString(value, 'seccion'),
  };
}

export class AuthRegisterService {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async register(input: unknown): Promise<RegistrationResult> {
    const payload = parsePayload(input);
    if (!payload) {
      return {
        success: false,
        error: 'Faltan campos requeridos: email, password y nombre',
      };
    }

    const rolesValidos: Role[] = [
      Role.ESTUDIANTE,
      Role.DOCENTE,
      Role.ADMIN,
      Role.COORDINACION,
    ];
    const rolFinal = rolesValidos.find((role) => role === payload.role) ?? Role.ESTUDIANTE;

    const existingUser = await this.prismaClient.user.findUnique({
      where: { email: payload.email },
    });
    if (existingUser) {
      return { success: false, error: 'El email ya está registrado' };
    }

    if (payload.cedulaIdentidad && rolFinal === Role.ESTUDIANTE) {
      const existingCedula = await this.prismaClient.estudiante.findUnique({
        where: { cedulaIdentidad: payload.cedulaIdentidad },
      });
      if (existingCedula) {
        return { success: false, error: 'La cédula ya está registrada' };
      }
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const verificationToken = createEmailVerificationToken();
    const result = await this.prismaClient.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.email,
          password: hashedPassword,
          nombre: payload.nombre,
          apellido: payload.apellido || null,
          telefono: payload.telefono || null,
          role: rolFinal,
          aprobado: rolFinal === Role.ESTUDIANTE ? false : true,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: verificationToken.tokenHash,
          expiresAt: verificationToken.expiresAt,
        },
      });

      let estudiante;
      if (rolFinal === Role.DOCENTE) {
        await tx.docente.create({
          data: {
            userId: user.id,
            especialidad: payload.especialidad || null,
          },
        });
      } else if (rolFinal === Role.ESTUDIANTE) {
        estudiante = await tx.estudiante.create({
          data: {
            userId: user.id,
            cedulaIdentidad: payload.cedulaIdentidad || null,
            nivel: payload.nivel || '',
            grado: payload.grado || '',
            seccion: payload.seccion || '',
          },
          select: { id: true, nivel: true, grado: true, seccion: true },
        });
      }

      return { user, estudiante, verificationToken: verificationToken.token };
    });

    try {
      await sendVerificationEmail(result.user.email, result.verificationToken);
    } catch (error) {
      await this.prismaClient.user.delete({ where: { id: result.user.id } });
      throw error;
    }

    return {
      success: true,
      message: 'Cuenta creada. Verifica tu correo para poder iniciar sesión.',
      user: {
        id: result.user.id,
        email: result.user.email,
        nombre: result.user.nombre,
        role: result.user.role,
      },
    };
  }
}

export const authRegisterService = new AuthRegisterService();
