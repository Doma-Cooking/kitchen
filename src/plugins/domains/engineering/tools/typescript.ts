#!/usr/bin/env npx tsx

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Project, ts } from 'ts-morph'
import { z } from 'zod'
import path from 'path'

const server = new McpServer({
  name: 'typescript',
  version: '1.0.0',
})

let cachedProject: Project | null = null
let cachedProjectRoot: string | null = null
let cachedTsconfigPath: string | undefined = undefined

function getProject(projectRoot: string, tsconfigPath?: string): Project {
  // Reinitialize if config changed
  if (cachedProject && cachedProjectRoot === projectRoot && cachedTsconfigPath === tsconfigPath) {
    return cachedProject
  }

  const resolvedTsconfig = tsconfigPath
    ? path.resolve(projectRoot, tsconfigPath)
    : ts.findConfigFile(projectRoot, ts.sys.fileExists, 'tsconfig.json')

  if (resolvedTsconfig) {
    cachedProject = new Project({ tsConfigFilePath: resolvedTsconfig })
  } else {
    cachedProject = new Project({
      compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
    })
  }
  cachedProjectRoot = projectRoot
  cachedTsconfigPath = tsconfigPath
  return cachedProject
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

server.registerTool(
  'ts_diagnostics',
  {
    description:
      'Get TypeScript compiler errors and warnings for specific files or the whole project. Returns diagnostics with file path, line, column, error code, and message.',
    inputSchema: {
      projectRoot: z.string().describe('Absolute path to the project root directory.'),
      tsconfigPath: z.string().optional().describe('Relative path to tsconfig.json from projectRoot. Auto-detected if omitted.'),
      files: z
        .array(z.string())
        .optional()
        .describe('Absolute file paths to check. Omit to check the whole project.'),
    },
  },
  async ({ projectRoot, tsconfigPath, files }) => {
    try {
      const proj = getProject(projectRoot, tsconfigPath)
      refreshFiles(proj, files)

      const diagnostics = files
        ? files.flatMap((f) => {
            const sf = proj.getSourceFile(f)
            return sf ? [...sf.getPreEmitDiagnostics()] : []
          })
        : [...proj.getPreEmitDiagnostics()]

      if (diagnostics.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No diagnostics found.' }] }
      }

      const cap = 50
      const lines: string[] = []

      for (const d of diagnostics.slice(0, cap)) {
        const sf = d.getSourceFile()
        const start = d.getStart()
        const filePath = sf ? rel(projectRoot, sf.getFilePath()) : '<unknown>'
        let line = 0
        let col = 0
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

      if (diagnostics.length > cap) {
        lines.push(`... and ${diagnostics.length - cap} more`)
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] }
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
      }
    }
  },
)

server.registerTool(
  'ts_type_at_position',
  {
    description:
      'Resolve the fully evaluated TypeScript type at a source location. Expands generics, resolves inference, and shows the concrete type.',
    inputSchema: {
      projectRoot: z.string().describe('Absolute path to the project root directory.'),
      tsconfigPath: z.string().optional().describe('Relative path to tsconfig.json from projectRoot. Auto-detected if omitted.'),
      file: z.string().describe('Absolute path to the file.'),
      line: z.number().describe('1-based line number.'),
      column: z.number().describe('1-based column number.'),
    },
  },
  async ({ projectRoot, tsconfigPath, file, line, column }) => {
    try {
      const proj = getProject(projectRoot, tsconfigPath)
      refreshFiles(proj, [file])

      const sourceFile = proj.getSourceFile(file)
      if (!sourceFile) {
        return { content: [{ type: 'text' as const, text: `Error: File not found: ${file}` }] }
      }

      const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(line - 1, column - 1)
      const descendant = sourceFile.getDescendantAtPos(pos)

      if (!descendant) {
        return {
          content: [{ type: 'text' as const, text: 'No node found at this position.' }],
        }
      }

      const typeChecker = proj.getTypeChecker()
      const nodeType = typeChecker.getTypeAtLocation(descendant)
      let typeText = nodeType.getText(descendant)

      if (typeText.length > 2000) {
        typeText = typeText.slice(0, 2000) + '...'
      }

      return { content: [{ type: 'text' as const, text: typeText }] }
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
      }
    }
  },
)

server.registerTool(
  'ts_go_to_definition',
  {
    description:
      'Jump to the source definition of a symbol. Resolves through barrel re-exports, path aliases, and type aliases.',
    inputSchema: {
      projectRoot: z.string().describe('Absolute path to the project root directory.'),
      tsconfigPath: z.string().optional().describe('Relative path to tsconfig.json from projectRoot. Auto-detected if omitted.'),
      file: z.string().describe('Absolute path to the file.'),
      line: z.number().describe('1-based line number.'),
      column: z.number().describe('1-based column number.'),
    },
  },
  async ({ projectRoot, tsconfigPath, file, line, column }) => {
    try {
      const proj = getProject(projectRoot, tsconfigPath)
      refreshFiles(proj, [file])

      const sourceFile = proj.getSourceFile(file)
      if (!sourceFile) {
        return { content: [{ type: 'text' as const, text: `Error: File not found: ${file}` }] }
      }

      const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(line - 1, column - 1)
      const languageService = proj.getLanguageService()
      const definitions = languageService.getDefinitionsAtPosition(sourceFile, pos)

      if (!definitions || definitions.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No definition found at this position.' }],
        }
      }

      const def = definitions[0]
      const defSourceFile = def.getSourceFile()
      const defStart = def.getTextSpan().getStart()
      const defPos = defSourceFile.getLineAndColumnAtPos(defStart)

      return {
        content: [
          {
            type: 'text' as const,
            text: `${rel(projectRoot, defSourceFile.getFilePath())}:${defPos.line}:${defPos.column}`,
          },
        ],
      }
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
      }
    }
  },
)

server.registerTool(
  'ts_find_references',
  {
    description:
      'Find all semantic references to a symbol. Understands re-exports, renamed imports, and type-level usage.',
    inputSchema: {
      projectRoot: z.string().describe('Absolute path to the project root directory.'),
      tsconfigPath: z.string().optional().describe('Relative path to tsconfig.json from projectRoot. Auto-detected if omitted.'),
      file: z.string().describe('Absolute path to the file.'),
      line: z.number().describe('1-based line number.'),
      column: z.number().describe('1-based column number.'),
    },
  },
  async ({ projectRoot, tsconfigPath, file, line, column }) => {
    try {
      const proj = getProject(projectRoot, tsconfigPath)
      refreshFiles(proj, [file])

      const sourceFile = proj.getSourceFile(file)
      if (!sourceFile) {
        return { content: [{ type: 'text' as const, text: `Error: File not found: ${file}` }] }
      }

      const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(line - 1, column - 1)
      const languageService = proj.getLanguageService()
      const references = languageService.findReferencesAtPosition(sourceFile, pos)

      if (!references || references.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No references found at this position.' }],
        }
      }

      const cap = 100
      const lines: string[] = []

      for (const refEntry of references) {
        const definition = refEntry.getDefinition()
        const defSourceFile = definition.getSourceFile()
        const defPos = defSourceFile.getLineAndColumnAtPos(definition.getTextSpan().getStart())
        lines.push(
          `${rel(projectRoot, defSourceFile.getFilePath())}:${defPos.line}:${defPos.column} (definition)`,
        )

        for (const ref of refEntry.getReferences()) {
          if (lines.length >= cap) break
          const refSf = ref.getSourceFile()
          const refPos = refSf.getLineAndColumnAtPos(ref.getTextSpan().getStart())
          const isDefinition = ref.isDefinition()
          const suffix = isDefinition ? ' (definition)' : ''
          lines.push(`${rel(projectRoot, refSf.getFilePath())}:${refPos.line}:${refPos.column}${suffix}`)
        }
        if (lines.length >= cap) break
      }

      const allRefs = references.flatMap((r) => r.getReferences())
      if (allRefs.length > cap) {
        lines.push(`... and ${allRefs.length - cap} more`)
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] }
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
      }
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
