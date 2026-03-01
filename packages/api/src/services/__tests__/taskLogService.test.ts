import { beforeEach, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { taskLogs } from '@bd2-automata/shared';
import { deleteLog } from '../taskLogService';

const getDbMock = vi.hoisted(() => vi.fn());

vi.mock('../../db/drizzle', () => ({
  getDb: getDbMock,
}));

describe('taskLogService soft delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deleteLog marks isDeleted=true for existing row', async () => {
    const updateReturning = vi.fn().mockResolvedValue([{ id: 7 }]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const update = vi.fn().mockReturnValue({ set: updateSet });

    getDbMock.mockReturnValue({ update });

    const result = await deleteLog({} as D1Database, 7);
    expect(result).toEqual({ message: '日志已成功删除。' });

    expect(update).toHaveBeenCalledWith(taskLogs);
    expect(updateSet).toHaveBeenCalledWith({ isDeleted: true });
    expect(updateWhere).toHaveBeenCalledWith(
      and(eq(taskLogs.id, 7), eq(taskLogs.isDeleted, false)),
    );
  });

  it('deleteLog throws 404 when row does not exist or already deleted', async () => {
    const updateReturning = vi.fn().mockResolvedValue([]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const update = vi.fn().mockReturnValue({ set: updateSet });

    getDbMock.mockReturnValue({ update });

    await expect(deleteLog({} as D1Database, 999)).rejects.toBeInstanceOf(HTTPException);
    await expect(deleteLog({} as D1Database, 999)).rejects.toMatchObject({ status: 404 });
  });
});
