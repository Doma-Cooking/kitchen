import { Redis } from 'ioredis'
import { randomUUID } from 'node:crypto'

const RELEASE_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`

export class RedisLock {
  private readonly redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)
  }

  async acquire(key: string, ttlSeconds: number): Promise<string | null> {
    const token = randomUUID()
    const result = await this.redis.set(key, token, 'EX', ttlSeconds, 'NX')
    return result === 'OK' ? token : null
  }

  async acquireAll(keys: string[], ttlSeconds: number): Promise<string[] | null> {
    if (keys.length === 0) return []

    const tokens: string[] = []
    for (const key of keys) {
      const token = await this.acquire(key, ttlSeconds)
      if (token === null) {
        // Partial failure — release all acquired so far
        for (let i = 0; i < tokens.length; i++) {
          await this.release(keys[i], tokens[i])
        }
        return null
      }
      tokens.push(token)
    }
    return tokens
  }

  async release(key: string, token: string): Promise<boolean> {
    const result = await this.redis.eval(RELEASE_LUA, 1, key, token)
    return result === 1
  }

  async releaseAll(keys: string[], tokens: string[]): Promise<void> {
    await Promise.all(keys.map((key, i) => this.release(key, tokens[i])))
  }

  async close(): Promise<void> {
    this.redis.disconnect()
  }
}
