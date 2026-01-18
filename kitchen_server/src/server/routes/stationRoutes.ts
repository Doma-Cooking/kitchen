import { Router } from 'express';
import { dependencies } from '../../server.js';

const router = Router();

router.post('/:id/cleanup', async (req, res) => {
    const id = req.params.id;
    await dependencies.cleanupStationUseCase.execute(id);
    res.send(`Cleaned up station with ID: ${id}`);
});

export default router;