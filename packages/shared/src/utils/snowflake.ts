const EPOCH = 1735689600000n; // 2025-01-01T00:00:00.000Z
const MACHINE_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_MACHINE_ID = (1n << MACHINE_ID_BITS) - 1n;
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;

const resolveMachineId = (input?: number): bigint => {
  const machineId = BigInt(input ?? 1);
  if (machineId < 0n || machineId > MAX_MACHINE_ID) {
    throw new Error(`machineId 超出范围，需在 0-${MAX_MACHINE_ID.toString()} 之间`);
  }
  return machineId;
};

const waitNextMillis = (current: bigint): bigint => {
  let now = BigInt(Date.now());
  while (now <= current) {
    now = BigInt(Date.now());
  }
  return now;
};

/**
 * 生成 64 位雪花 ID，并以 string 返回，避免前端/JSON 精度丢失。
 */
export const createSnowflakeIdGenerator = (machineIdInput?: number) => {
  const machineId = resolveMachineId(machineIdInput);
  let sequence = 0n;
  let lastTimestamp = 0n;

  return (): string => {
    let timestamp = BigInt(Date.now());

    if (timestamp < lastTimestamp) {
      timestamp = lastTimestamp;
    }

    if (timestamp === lastTimestamp) {
      sequence = (sequence + 1n) & MAX_SEQUENCE;
      if (sequence === 0n) {
        timestamp = waitNextMillis(lastTimestamp);
      }
    } else {
      sequence = 0n;
    }

    lastTimestamp = timestamp;

    const id =
      ((timestamp - EPOCH) << (MACHINE_ID_BITS + SEQUENCE_BITS)) |
      (machineId << SEQUENCE_BITS) |
      sequence;

    return id.toString();
  };
};

export const generateSnowflakeId = createSnowflakeIdGenerator();
