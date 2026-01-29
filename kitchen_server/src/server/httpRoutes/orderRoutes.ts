import { Router } from 'express';
import { dependencies } from '../../server.js';

const router = Router();

router.post('/queue', async (req, res) => {
    const args = req.body as Record<string, unknown>;
    const id = args.id as string | undefined;
    const name = args.name as string | undefined;
    const input = args.input as object | undefined;
    const recipeId = args.recipeId as string | undefined;
    const stationId = args.stationId as string | undefined;

    if (!recipeId) {
        res.status(400).send("recipeId is required to queue an order");
        return;
    }

    await dependencies.queueOrderUseCase.execute(
        recipeId,
        id,
        name,
        input,
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
