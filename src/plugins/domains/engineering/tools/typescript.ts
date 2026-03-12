#!/usr/bin/env npx tsx

import { Command } from 'commander'
import { Project, ts } from 'ts-morph'
import path from 'path'

function getProject(projectRoot: string, tsconfigPath?: string): Project {
  const resolvedTsconfig = tsconfigPath
    ? path.resolve(projectRoot, tsconfigPath)
    : ts.findConfigFile(projectRoot, ts.sys.fileExists, 'tsconfig.json')

  if (resolvedTsconfig) {
    return new Project({ tsConfigFilePath: resolvedTsconfig })
  }
  return new Project({
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  })
}

function refreshFiles(proj: Project, files?: string[]) {
  if (files && files.length > 0) {
    for (const filePath of files) {
      const sourceFile = proj.getSourceFile(filePath)
      if (sourceFile) {
        sourceFile.refreshFromFileSystemSync()
      } else {
        proj.addSourceFileAtPathIfExists(filePath)
      }
    }
  }
}

function rel(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath)
}

function fail(e: unknown): never {
  console.error((e as Error).message)
  process.exit(1)
}

const program = new Command()
  .name('kitchen-typescript')
  .description('TypeScript analysis tools CLI')

program
  .command('diagnostics')
  .description('Get TypeScript compiler errors and warnings for specific files or the whole project')
  .requiredOption('--projectRoot <path>', 'Absolute path to the project root directory')
  .option('--tsconfigPath <path>', 'Relative path to tsconfig.json from projectRoot. Auto-detected if omitted.')
  .option('--files <json>', 'Absolute file paths to check as JSON array. Omit to check whole project.', '[]')
  .action((opts) => {
    try {
      const files: string[] = JSON.parse(opts.files)
      const proj = getProject(opts.projectRoot, opts.tsconfigPath)
      refreshFiles(proj, files.length ? files : undefined)

      const diagnostics = files.length
        ? files.flatMap((f) => {
            const sf = proj.getSourceFile(f)
            return sf ? [...sf.getPreEmitDiagnostics()] : []
          })
        : [...proj.getPreEmitDiagnostics()]

      if (diagnostics.length === 0) {
        console.log('No diagnostics found.')
        return
      }

      const cap = 50
      const lines: string[] = []
      for (const d of diagnostics.slice(0, cap)) {
        const sf = d.getSourceFile()
        const start = d.getStart()
        const filePath = sf ? rel(opts.projectRoot, sf.getFilePath()) : '<unknown>'
        let line = 0, col = 0
        if (sf && start !== undefined) {
          const pos = sf.getLineAndColumnAtPos(start)
          line = pos.line
          col = pos.column
        }
        const code = d.getCode()
        const message = d.getMessageText()
        const msgStr = typeof message === 'string' ? message : message.getMessageText()
        lines.push(`${filePath}:${line}:${col} TS${code}: ${msgStr}`)
      }
      if (diagnostics.length > cap) lines.push(`... and ${diagnostics.length - cap} more`)
      console.log(lines.join('\n'))
    } catch (e) { fail(e) }
  })

program
  .command('type-at-position')
  .description('Resolve the fully evaluated TypeScript type at a source location')
  .requiredOption('--projectRoot <path>', 'Absolute path to the project root directory')
  .option('--tsconfigPath <path>', 'Relative path to tsconfig.json from projectRoot. Auto-detected if omitted.')
  .requiredOption('--file <path>', 'Absolute path to the file')
  .requiredOption('--line <number>', '1-based line number', parseInt)
  .requiredOption('--column <number>', '1-based column number', parseInt)
  .action((opts) => {
    try {
      const proj = getProject(opts.projectRoot, opts.tsconfigPath)
      refreshFiles(proj, [opts.file])
      const sourceFile = proj.getSourceFile(opts.file)
      if (!sourceFile) { console.error(`Error: File not found: ${opts.file}`); process.exit(1) }

      const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(opts.line - 1, opts.column - 1)
      const descendant = sourceFile.getDescendantAtPos(pos)
      if (!descendant) { console.log('No node found at this position.'); return }

      const typeChecker = proj.getTypeChecker()
      const nodeType = typeChecker.getTypeAtLocation(descendant)
      let typeText = nodeType.getText(descendant)
      if (typeText.length > 2000) typeText = typeText.slice(0, 2000) + '...'
      console.log(typeText)
    } catch (e) { fail(e) }
  })

program
  .command('go-to-definition')
  .description('Jump to the source definition of a symbol')
  .requiredOption('--projectRoot <path>', 'Absolute path to the project root directory')
  .option('--tsconfigPath <path>', 'Relative path to tsconfig.json from projectRoot. Auto-detected if omitted.')
  .requiredOption('--file <path>', 'Absolute path to the file')
  .requiredOption('--line <number>', '1-based line number', parseInt)
  .requiredOption('--column <number>', '1-based column number', parseInt)
  .action((opts) => {
    try {
      const proj = getProject(opts.projectRoot, opts.tsconfigPath)
      refreshFiles(proj, [opts.file])
      const sourceFile = proj.getSourceFile(opts.file)
      if (!sourceFile) { console.error(`Error: File not found: ${opts.file}`); process.exit(1) }

      const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(opts.line - 1, opts.column - 1)
      const languageService = proj.getLanguageService()
      const definitions = languageService.getDefinitionsAtPosition(sourceFile, pos)
      if (!definitions || definitions.length === 0) { console.log('No definition found at this position.'); return }

      const def = definitions[0]
      const defSourceFile = def.getSourceFile()
      const defStart = def.getTextSpan().getStart()
      const defPos = defSourceFile.getLineAndColumnAtPos(defStart)
      console.log(`${rel(opts.projectRoot, defSourceFile.getFilePath())}:${defPos.line}:${defPos.column}`)
    } catch (e) { fail(e) }
  })

program
  .command('find-references')
  .description('Find all semantic references to a symbol')
  .requiredOption('--projectRoot <path>', 'Absolute path to the project root directory')
  .option('--tsconfigPath <path>', 'Relative path to tsconfig.json from projectRoot. Auto-detected if omitted.')
  .requiredOption('--file <path>', 'Absolute path to the file')
  .requiredOption('--line <number>', '1-based line number', parseInt)
  .requiredOption('--column <number>', '1-based column number', parseInt)
  .action((opts) => {
    try {
      const proj = getProject(opts.projectRoot, opts.tsconfigPath)
      refreshFiles(proj, [opts.file])
      const sourceFile = proj.getSourceFile(opts.file)
      if (!sourceFile) { console.error(`Error: File not found: ${opts.file}`); process.exit(1) }

      const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(opts.line - 1, opts.column - 1)
      const languageService = proj.getLanguageService()
      const references = languageService.findReferencesAtPosition(sourceFile, pos)
      if (!references || references.length === 0) { console.log('No references found at this position.'); return }

      const cap = 100
      const lines: string[] = []
      for (const refEntry of references) {
        const definition = refEntry.getDefinition()
        const defSourceFile = definition.getSourceFile()
        const defPos = defSourceFile.getLineAndColumnAtPos(definition.getTextSpan().getStart())
        lines.push(`${rel(opts.projectRoot, defSourceFile.getFilePath())}:${defPos.line}:${defPos.column} (definition)`)

        for (const ref of refEntry.getReferences()) {
          if (lines.length >= cap) break
          const refSf = ref.getSourceFile()
          const refPos = refSf.getLineAndColumnAtPos(ref.getTextSpan().getStart())
          lines.push(`${rel(opts.projectRoot, refSf.getFilePath())}:${refPos.line}:${refPos.column}${ref.isDefinition() ? ' (definition)' : ''}`)
        }
        if (lines.length >= cap) break
      }

      const allRefs = references.flatMap((r) => r.getReferences())
      if (allRefs.length > cap) lines.push(`... and ${allRefs.length - cap} more`)
      console.log(lines.join('\n'))
    } catch (e) { fail(e) }
  })

await program.parseAsync()
