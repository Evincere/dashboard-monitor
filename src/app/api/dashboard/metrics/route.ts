// src/app/api/dashboard/metrics/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[DASHBOARD] Dashboard metrics called');
  
  const result = {
    activeUsers: 371,
    activeContests: 5,
    processedDocs: 2522,
    inscriptions: 292,
    storageUsed: 2.5
  };
  
  console.log('[DASHBOARD] Returning result:', result);
  
  return NextResponse.json(result);
}
