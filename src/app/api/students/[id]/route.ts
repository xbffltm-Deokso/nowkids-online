import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { students } from '@/lib/schema';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [row] = await db.delete(students).where(eq(students.id, id)).returning();

    if (!row) {
        return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json(row);
}
