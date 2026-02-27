import { Router } from 'express';
import { dependencies } from '../../server.js';
import { randomUUID } from 'crypto';

const router = Router();

router.post('/queue', async (req, res) => {
    const args = req.body as Record<string, unknown>;
    const recipeId = args.recipeId as string | undefined;

    if (!recipeId) {
        res.status(400).send("recipeId is required to queue an order");
        return;
    }

    await dependencies.queueOrderUseCase.execute({
        id: (args.id as string | undefined) ?? randomUUID(),
        name: (args.name as string | undefined) ?? `order-${Date.now().toString()}`,
        input: args.input as object | undefined,
        recipeId,
        stationId: args.stationId as string | undefined,
    }, dependencies.config.orderQueue.name);
    res.send(`Order queued with input: ${JSON.stringify(args)}`);
});

router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    await dependencies.deleteOrderUseCase.execute(id, dependencies.config.orderQueue.name);
    res.send(`Deleted order with ID: ${id}`);
});

export default router;
