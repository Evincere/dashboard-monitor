import { NextResponse } from 'next/server';
import { apiUrl } from '@/lib/utils';

export async function GET() {
  try {
    const response = await fetch(
      apiUrl('inscriptions?status=PENDING,COMPLETED_WITH_DOCS&size=100'),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'API returned success: false');
    }

    // Solo retornar los datos necesarios
    const pendingPostulants = data.data.map((p: any) => ({
      userInfo: {
        dni: p.userInfo.dni,
        fullName: p.userInfo.fullName
      },
      state: p.state
    }));

    return NextResponse.json({
      success: true,
      data: pendingPostulants
    });
  } catch (error) {
    console.error('Error fetching pending postulations:', error);
    return NextResponse.json(
      { success: false, error: 'Error fetching pending postulations' },
      { status: 500 }
    );
  }
}
