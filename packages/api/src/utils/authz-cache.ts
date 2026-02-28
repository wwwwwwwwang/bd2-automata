export const AUTHZ_CACHE_VERSION_KEY = 'authz:version';
export const AUTHZ_PERMISSION_CACHE_PREFIX = 'authz:permissions';

export const getAuthzCacheVersion = async (kv: KVNamespace): Promise<string> => {
  const version = await kv.get(AUTHZ_CACHE_VERSION_KEY);
  return version ?? '0';
};

export const buildPermissionCacheKey = (userId: string | number, version: string): string => {
  return `${AUTHZ_PERMISSION_CACHE_PREFIX}:v${version}:u${userId}`;
};

export const bumpAuthzCacheVersion = async (kv: KVNamespace): Promise<string> => {
  const nextVersion = Date.now().toString();
  await kv.put(AUTHZ_CACHE_VERSION_KEY, nextVersion);
  return nextVersion;
};
