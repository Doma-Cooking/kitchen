import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const PROMPT_DIR = join(import.meta.dirname, "../src/implementation/prompt");
const OUTPUT_FILE = join(PROMPT_DIR, "prompts.generated.ts");

async function main() {
    const files = (await readdir(PROMPT_DIR)).filter((f) => f.endsWith(".md")).sort();

    const entries: string[] = [];
    for (const file of files) {
        const id = file.replace(/\.md$/, "");
        const content = (await readFile(join(PROMPT_DIR, file), "utf-8")).trim();
        // Escape backticks and template expressions so the content is safe inside a template literal
        const escaped = content.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
        entries.push(`    ${JSON.stringify(id)}: \`${escaped}\``);
    }

    const output = [
        "// Auto-generated — do not edit. Source: src/implementation/prompt/*.md",
        "export const prompts: Record<string, string> = {",
        entries.join(",\n"),
        "};",
        "",
    ].join("\n");

    await writeFile(OUTPUT_FILE, output, "utf-8");
    console.log(`Generated ${OUTPUT_FILE} with ${files.length} prompt(s)`);
}

main();
