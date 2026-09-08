import { cp, mkdir, stat } from 'node:fs/promises'
import { resolve, relative, sep } from 'node:path'

const repository = resolve(import.meta.dir, '..')

export async function buildSite(destination = resolve(repository, 'dist/site')) {
  await mkdir(destination, { recursive: true })
  for (const file of ['index.html', 'examples.html', 'site.css', 'install.sh', 'CNAME', 'examples']) {
    await cp(resolve(repository, file), resolve(destination, file), { recursive: true })
  }
  const docs = Bun.spawn([process.execPath, resolve(repository, 'scripts/build-docs.ts'), resolve(destination, 'docs')], {
    cwd: repository, stdout: 'inherit', stderr: 'inherit',
  })
  if (await docs.exited !== 0) throw new Error('Documentation build failed')
  await Bun.write(resolve(destination, '.nojekyll'), '')
  return destination
}

export async function siteResponse(request: Request, directory: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })
  try {
    const pathname = decodeURIComponent(new URL(request.url).pathname)
    let path = resolve(directory, `.${pathname}`)
    const location = relative(directory, path)
    if (location === '..' || location.startsWith(`..${sep}`) || pathname.includes('\0')) {
      return new Response('Not found', { status: 404 })
    }
    if ((await stat(path)).isDirectory()) {
      if (!pathname.endsWith('/')) {
        const target = new URL(request.url)
        target.pathname += '/'
        return Response.redirect(target, 308)
      }
      path = resolve(path, 'index.html')
    }
    const file = Bun.file(path)
    if (!await file.exists()) return new Response('Not found', { status: 404 })
    return new Response(request.method === 'HEAD' ? null : file, { headers: { 'Content-Type': file.type, 'Cache-Control': 'no-store' } })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

if (import.meta.main) {
  const directory = await buildSite()
  if (process.argv.includes('--serve')) {
    const server = Bun.serve({ hostname: '127.0.0.1', port: 4173, fetch: (request) => siteResponse(request, directory) })
    console.log(`Beautiflow website: ${server.url}`)
    console.log('Includes generated docs. Stop with Ctrl-C; rerun after editing the site.')
  } else {
    console.log(`Built website in ${directory}`)
  }
}
