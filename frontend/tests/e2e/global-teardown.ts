import { execFile } from 'node:child_process'

// Helper processes that WebKit's multi-process architecture spawns on
// Windows. After a hung browser.close() (see RUNBOOK "Problemas conocidos",
// RB-07), one or more of these can survive the Node worker process,
// inflating zombie-process count across local test runs and increasing the
// chance of the same hang recurring next time. Best-effort cleanup only —
// taskkill failures (e.g. "process not found" because cleanup already
// succeeded) are expected and ignored.
const WINDOWS_ZOMBIE_PROCESSES = [
  'Playwright.exe',
  'WebKitWebProcess.exe',
  'WebKitNetworkProcess.exe',
  'WebKitGPUProcess.exe',
]

async function killByImageName(imageName: string): Promise<void> {
  await new Promise<void>((resolve) => {
    execFile('taskkill', ['/F', '/IM', imageName, '/T'], () => resolve())
  })
}

/**
 * Best-effort cleanup of leftover WebKit/Playwright helper processes on
 * Windows. No-op on CI (ubuntu-latest) and on non-Windows platforms.
 */
export default async function globalTeardown(): Promise<void> {
  if (process.platform !== 'win32') {
    return
  }

  await Promise.all(WINDOWS_ZOMBIE_PROCESSES.map(killByImageName))
}
