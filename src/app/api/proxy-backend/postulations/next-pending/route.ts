import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { currentDni } = await request.json();
    
    // Hacer la llamada al backend real
    const response = await fetch(`${process.env.BACKEND_URL}/inscriptions?size=1000`);
    const result = await response.json();

    if (!result.success || !result.data?.content) {
      throw new Error('Error al obtener la lista de postulantes');
    }

    // Filtrar postulantes que necesitan validación
    const pendingPostulants = result.data.content.filter((p: any) => {
      return (
        p.userInfo?.fullName &&
        p.userInfo?.dni &&
        (p.state === 'COMPLETED_WITH_DOCS' || p.state === 'PENDING')
      );
    });

    // Ordenar por nombre
    const sortedPostulants = pendingPostulants.sort((a: any, b: any) => 
      a.userInfo.fullName.toLowerCase().localeCompare(b.userInfo.fullName.toLowerCase(), 'es')
    );

    // Encontrar el índice del postulante actual
    const currentIndex = sortedPostulants.findIndex(
      (p: any) => p.userInfo.dni === currentDni
    );

    // Obtener el siguiente postulante
    const nextPostulant = sortedPostulants[currentIndex + 1];

    return NextResponse.json({
      success: true,
      data: {
        nextDni: nextPostulant?.userInfo.dni || null,
        totalPending: pendingPostulants.length
      }
    });
  } catch (error) {
    console.error('Error getting next postulant:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
