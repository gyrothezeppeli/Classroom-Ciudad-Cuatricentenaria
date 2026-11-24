import { NextRequest, NextResponse } from 'next/server';
import { estudiantesService } from '@/lib/services/estudiantes-service'
import { prisma } from '@/lib/prisma'
import { StudentAssignmentService } from '@/lib/asignar'

export async function GET(req: NextRequest) {
  return estudiantesService.GET(req);
}

export async function POST(req: NextRequest) {
  return estudiantesService.POST(req);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === 'string') : [];
    const accion = body.accion;

    if (!ids.length || !['aprobar', 'rechazar'].includes(accion)) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    }

    if (accion === 'rechazar') {
      const resultado = await prisma.user.deleteMany({
        where: {
          estudiante: { id: { in: ids } },
          emailVerified: { not: null },
        },
      });
      return NextResponse.json({ exitosos: resultado.count });
    }

    const estudiantes = await prisma.estudiante.findMany({
      where: {
        id: { in: ids },
        user: { aprobado: false, emailVerified: { not: null } },
      },
      select: { id: true, nivel: true, grado: true, seccion: true, userId: true },
    });

    await prisma.user.updateMany({
      where: { id: { in: estudiantes.map((estudiante) => estudiante.userId) } },
      data: { aprobado: true },
    });

    const asignador = new StudentAssignmentService(prisma);
    await Promise.all(estudiantes.map((estudiante) => asignador.assignExistingContent(estudiante)));

    return NextResponse.json({ exitosos: estudiantes.length });
  } catch (error) {
    console.error('Error procesando solicitudes de estudiantes:', error);
    return NextResponse.json({ error: 'No se pudieron procesar las solicitudes' }, { status: 500 });
  }
}
