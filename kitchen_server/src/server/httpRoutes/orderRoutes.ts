import { Router } from 'express';
import { dependencies } from '../../server.js';

const router = Router();

router.post('/queue', async (req, res) => {
    const args = req.body as Record<string, unknown>;
    const id = args.id as string | null ?? null;
    const name = args.name as string | null ?? null;
    const input = args.input as string | null ?? null;
    const recipeId = args.recipeId as string | null ?? null;
    const stationId = args.stationId as string | null ?? null;

    await dependencies.queueOrderUseCase.execute(
        id,
        name,
        input,
        recipeId,
        stationId
    );
    res.send(`Order queued with input: ${JSON.stringify(args)}`);
});

router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    await dependencies.deleteOrderUseCase.execute(id);
    res.send(`Deleted order with ID: ${id}`);
});

export default router;
