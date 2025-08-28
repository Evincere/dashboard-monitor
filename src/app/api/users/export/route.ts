// src/app/api/users/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket } from 'mysql2';

// CSV export function for users
async function exportUsersToCSV(request: NextRequest) {
  try {
    console.log('🔍 [Users Export] Starting CSV export request...');
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    
    console.log('📊 [Users Export] Export parameters:', { search, role, status });

    const connection = await getDatabaseConnection();
    
    try {
      console.log('✅ [Users Export] DB connection successful');

      // Build WHERE clause with proper parameterization
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (search && search.trim()) {
        whereConditions.push('(CONCAT(first_name, " ", last_name) LIKE ? OR username LIKE ? OR email LIKE ?)');
        const searchParam = `%${search.trim()}%`;
        queryParams.push(searchParam, searchParam, searchParam);
      }

      if (role && role !== 'all') {
        // Note: user_entity doesn't have role, but we can add a placeholder filter if needed
        console.log('⚠️ [Users Export] Role filtering not available in user_entity table');
      }

      if (status && status !== 'all') {
        whereConditions.push('status = ?');
        queryParams.push(status);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      console.log('🔍 [Users Export] Built WHERE clause:', whereClause);
      console.log('🔍 [Users Export] Query parameters:', queryParams);

      // Query to get all matching users (no pagination for export)
      const usersQuery = `
        SELECT 
          HEX(id) as id,
          CONCAT(first_name, ' ', last_name) as name,
          first_name,
          last_name,
          username,
          email,
          'ROLE_USER' as role,
          status,
          telefono,
          municipality as localidad,
          created_at as registrationDate,
          created_at,
          created_at as updated_at
        FROM user_entity 
        ${whereClause}
        ORDER BY created_at DESC
      `;
      
      console.log('🔍 [Users Export] Executing users export query...');
      
      const [usersResult] = await Promise.race([
        queryParams.length > 0 ? connection.execute(usersQuery, queryParams) : connection.query(usersQuery),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Export query timeout')), 30000))
      ]) as [RowDataPacket[], any];
      
      console.log('📊 [Users Export] Users retrieved for export:', usersResult.length);

      // Generate CSV content
      const csvHeaders = [
        'ID',
        'Nombre Completo',
        'Nombre',
        'Apellido', 
        'Usuario',
        'Email',
        'Rol',
        'Estado',
        'Teléfono',
        'Localidad',
        'Fecha de Registro',
        'Fecha de Creación',
        'Fecha de Actualización'
      ];

      const csvRows = usersResult.map((user: any) => [
        user.id || '',
        user.name || '',
        user.first_name || '',
        user.last_name || '',
        user.username || '',
        user.email || '',
        user.role || '',
        user.status || '',
        user.telefono || '',
        user.localidad || '',
        user.registrationDate ? new Date(user.registrationDate).toLocaleString('es-ES') : '',
        user.created_at ? new Date(user.created_at).toLocaleString('es-ES') : '',
        user.updated_at ? new Date(user.updated_at).toLocaleString('es-ES') : ''
      ]);

      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      console.log('✅ [Users Export] CSV generated successfully');

      // Generate filename with timestamp and filters
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      let filename = `usuarios_${timestamp}`;
      
      if (search) filename += `_busqueda-${search.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (role && role !== 'all') filename += `_rol-${role}`;
      if (status && status !== 'all') filename += `_estado-${status}`;
      
      filename += '.csv';

      console.log('📁 [Users Export] Generated filename:', filename);

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      });

    } finally {
      connection.release();
      console.log('🔧 [Users Export] DB connection released');
    }

  } catch (error) {
    console.error('❌ [Users Export] Error exporting users:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('timeout');
    
    return NextResponse.json(
      {
        error: 'Failed to export users',
        details: errorMessage,
        isTimeout,
        timestamp: new Date().toISOString(),
        suggestion: isTimeout ? 'The export took too long. Try using more specific filters.' : 'Please try again or contact support.'
      },
      { status: isTimeout ? 408 : 500 }
    );
  }
}

// Export the GET handler
export const GET = exportUsersToCSV;
