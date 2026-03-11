import { execFile } from 'node:child_process'
import { access, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { ConfigRepository } from '../repository/config.repository.ts'

const execFileAsync = promisify(execFile)

export class WorkspaceSource {
  constructor(
    private configRepository: ConfigRepository
  ) { }

  getWorkspacePath(stationId: string): string {
    return join(this.configRepository.getConfig().workspacesPath, stationId)
  }

  getSnapshotPath(stationId: string): string {
    return join(this.configRepository.getConfig().snapshotsPath, `${stationId}.tar.zst`)
  }

  async hasSnapshot(stationId: string): Promise<boolean> {
    try {
      await access(this.getSnapshotPath(stationId))
      return true
    } catch {
      return false
    }
  }

  async restore(stationId: string): Promise<string> {
    const workspacePath = this.getWorkspacePath(stationId)
    await rm(workspacePath, { recursive: true, force: true })
    await mkdir(workspacePath, { recursive: true })

    const snapshotPath = this.getSnapshotPath(stationId)
    if (await this.hasSnapshot(stationId)) {
      await execFileAsync('tar', ['-I', 'zstd -T0', '-xf', snapshotPath, '-C', workspacePath])
      await rm(snapshotPath)
    }

    return workspacePath
  }

  async snapshot(stationId: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(stationId)
    const snapshotPath = this.getSnapshotPath(stationId)
    const tmpPath = `${snapshotPath}.tmp`

    await execFileAsync('tar', ['-I', 'zstd -T0 -1', '-cf', tmpPath, '-C', workspacePath, '.'])
    await execFileAsync('mv', [tmpPath, snapshotPath])
    await rm(workspacePath, { recursive: true, force: true })
  }
}
