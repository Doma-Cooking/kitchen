import { Router } from 'express';
import { dependencies } from '../../server.js';

const router = Router();

router.post('/queue', async (req, res) => {
    const args = req.body as Record<string, unknown>;
    const input = args.input as string | null ?? null;
    const procedureName = args.procedureName as string | null ?? null;
    const stationId = args.stationId as string | null ?? null;

    await dependencies.queueTaskUseCase.execute(input, procedureName, stationId);
    res.send(`Task queued with input: ${input ?? "N/A"}, procedureName: ${procedureName ?? "N/A"}, stationId: ${stationId ?? "N/A"}`);
});

export default router;