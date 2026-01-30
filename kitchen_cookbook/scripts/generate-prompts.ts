import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const PROMPT_DIR = join(import.meta.dirname, "../src/implementation/prompt");
const PROMPT_OUTPUT = join(PROMPT_DIR, "prompts.generated.ts");

const TEMPLATE_DIR = join(import.meta.dirname, "../src/implementation/template");
const TEMPLATE_OUTPUT = join(TEMPLATE_DIR, "templates.generated.ts");

function escapeForTemplateLiteral(content: string): string {
    return content.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

async function generateMap(dir: string, outputFile: string, exportName: string, sourceComment: string): Promise<void> {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();

    const entries: string[] = [];
    for (const file of files) {
        const id = file.replace(/\.md$/, "");
        const content = (await readFile(join(dir, file), "utf-8")).trim();
        const escaped = escapeForTemplateLiteral(content);
        entries.push(`    ${JSON.stringify(id)}: \`${escaped}\``);
    }

    const output = [
        `// Auto-generated — do not edit. Source: ${sourceComment}`,
        `export const ${exportName}: Record<string, string> = {`,
        entries.join(",\n"),
        "};",
        "",
    ].join("\n");

    await writeFile(outputFile, output, "utf-8");
    console.log(`Generated ${outputFile} with ${files.length} entry(ies)`);
}

async function main() {
    await Promise.all([
        generateMap(PROMPT_DIR, PROMPT_OUTPUT, "prompts", "src/implementation/prompt/*.md"),
        generateMap(TEMPLATE_DIR, TEMPLATE_OUTPUT, "templates", "src/implementation/template/*.md"),
    ]);
}

main();
