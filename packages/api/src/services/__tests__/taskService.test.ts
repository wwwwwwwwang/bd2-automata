import { beforeEach, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { tasks } from '@bd2-automata/shared';
import { deleteTask, findTaskById } from '../taskService';

const getDbMock = vi.hoisted(() => vi.fn());

vi.mock('../../db/drizzle', () => ({
  getDb: getDbMock,
}));

describe('taskService soft delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deleteTask marks isDeleted=true and findTaskById cannot see deleted row', async () => {
    const updateReturning = vi.fn().mockResolvedValue([{ id: 9 }]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const update = vi.fn().mockReturnValue({ set: updateSet });

    const findFirst = vi.fn().mockResolvedValue(undefined);

    getDbMock.mockReturnValue({
      update,
      query: {
        tasks: {
          findFirst,
        },
      },
    });

    const deleted = await deleteTask({} as D1Database, 9);
    expect(deleted).toEqual({ message: '任务已成功删除。' });

    expect(update).toHaveBeenCalledWith(tasks);
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ isDeleted: true }),
    );
    expect(updateWhere).toHaveBeenCalledWith(
      and(eq(tasks.id, 9), eq(tasks.isDeleted, false)),
    );

    await expect(findTaskById({} as D1Database, 9)).rejects.toMatchObject({ status: 404 });
    expect(findFirst).toHaveBeenCalledWith({
      where: and(eq(tasks.id, 9), eq(tasks.isDeleted, false)),
    });
  });

  it('deleteTask throws 404 when row does not exist or already deleted', async () => {
    const updateReturning = vi.fn().mockResolvedValue([]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const update = vi.fn().mockReturnValue({ set: updateSet });

    getDbMock.mockReturnValue({ update });

    await expect(deleteTask({} as D1Database, 404)).rejects.toBeInstanceOf(HTTPException);
    await expect(deleteTask({} as D1Database, 404)).rejects.toMatchObject({ status: 404 });
  });
});
