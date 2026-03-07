import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Admin authentication
const ADMIN_ADDRESSES = (process.env.ADMIN_ADDRESSES || '').toLowerCase().split(',');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

function verifyAdmin(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return ADMIN_ADDRESSES.includes(token.toLowerCase()) || token === ADMIN_API_KEY;
}

/**
 * GET /api/admin/logs
 * Get admin activity logs
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!verifyAdmin(authHeader)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const logs = await prisma.adminLog.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: logs,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    
    // Return empty logs if database not available
    return NextResponse.json({
      success: true,
      data: [],
      message: 'No logs available',
      timestamp: Date.now(),
    });
  }
}
