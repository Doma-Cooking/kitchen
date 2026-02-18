import { query } from '@anthropic-ai/claude-agent-sdk';
import { StationRepository } from '../repository/stationRepository.js';
import { StationRefEntity, parseRef } from '../entity/stationRefEntity.js';
import { ResolveStationUseCase } from './resolveStationUseCase.js';

export interface ClassifyTriggerInput {
    message: string;
    sourceRef: StationRefEntity;
    repo?: string;
}

export interface ClassifyTriggerOutput {
    stationId: string;
    isNew: boolean;
    matchedRef?: StationRefEntity;
    confidence: number;
}

interface ClassificationResult {
    matchedRef: string | null;
    confidence: number;
    reasoning: string;
}

export interface ClassifyTriggerUseCase {
    execute(input: ClassifyTriggerInput): Promise<ClassifyTriggerOutput>;
}

export class ClassifyTriggerUseCaseImpl implements ClassifyTriggerUseCase {
    private repository: StationRepository;
    private resolveStationUseCase: ResolveStationUseCase;

    constructor(repository: StationRepository, resolveStationUseCase: ResolveStationUseCase) {
        this.repository = repository;
        this.resolveStationUseCase = resolveStationUseCase;
    }

    async execute(input: ClassifyTriggerInput): Promise<ClassifyTriggerOutput> {
        // Fast path: source ref already linked to a station
        const existingStationId = await this.repository.findStationByRef(input.sourceRef);
        if (existingStationId) {
            return {
                stationId: existingStationId,
                isNew: false,
                confidence: 1.0,
            };
        }

        // Fetch all refs for LLM context
        const allRefs = await this.repository.getAllRefs();
        if (allRefs.length === 0) {
            // No existing work streams — create new station
            const stationId = await this.resolveStationUseCase.execute({ ref: input.sourceRef });
            return {
                stationId,
                isNew: true,
                confidence: 1.0,
            };
        }

        // Call LLM for classification
        const prompt = buildClassificationPrompt(input.message, allRefs, input.repo);
        const classification = await callClassificationModel(prompt);

        // High confidence match
        if (classification.matchedRef && classification.confidence >= 0.7) {
            const matchedRefEntity = parseRef(classification.matchedRef);
            const stationId = await this.resolveStationUseCase.execute({
                ref: matchedRefEntity,
                additionalRefs: [input.sourceRef],
            });
            return {
                stationId,
                isNew: false,
                matchedRef: matchedRefEntity,
                confidence: classification.confidence,
            };
        }

        // Low confidence — let caller decide
        if (classification.confidence < 0.7 && classification.matchedRef) {
            const matchedRefEntity = parseRef(classification.matchedRef);
            const refResult = await this.repository.findStationByRef(matchedRefEntity);
            return {
                stationId: refResult ?? '',
                isNew: false,
                matchedRef: matchedRefEntity,
                confidence: classification.confidence,
            };
        }

        // New work stream
        const stationId = await this.resolveStationUseCase.execute({ ref: input.sourceRef });
        return {
            stationId,
            isNew: true,
            confidence: classification.confidence,
        };
    }
}

function buildClassificationPrompt(
    message: string,
    refs: { ref: string; stationId: string }[],
    repo?: string
): string {
    const refsList = refs.map(r => `- ${r.ref} (station: ${r.stationId})`).join('\n');
    const repoContext = repo ? `\nRepository context: ${repo}` : '';

    return `You are classifying an incoming message to determine which active work stream it belongs to.
${repoContext}

Active work streams (refs):
${refsList}

User message:
${message}

Determine if this message relates to any existing work stream. Respond with JSON only:
{
  "matchedRef": "<ref string or null if no match>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief explanation>"
}`;
}

async function callClassificationModel(prompt: string): Promise<ClassificationResult> {
    let resultText = '';

    for await (const message of query({
        prompt,
        options: {
            model: 'claude-haiku-4-5-20251001',
            maxTurns: 1,
            permissionMode: 'bypassPermissions',
            allowDangerouslySkipPermissions: true,
        },
    })) {
        if (message.type === 'result' && message.subtype === 'success') {
            resultText = message.result;
        }
    }

    try {
        const jsonMatch = /\{[\s\S]*\}/.exec(resultText);
        if (!jsonMatch) {
            return { matchedRef: null, confidence: 0, reasoning: 'Failed to parse response' };
        }
        return JSON.parse(jsonMatch[0]) as ClassificationResult;
    } catch {
        return { matchedRef: null, confidence: 0, reasoning: 'Failed to parse response' };
    }
}
