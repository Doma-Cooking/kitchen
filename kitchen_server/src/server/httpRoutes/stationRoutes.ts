import { Router } from 'express';
import { dependencies } from '../../server.js';

const router = Router();

router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    await dependencies.station.deleteStationUseCase.execute(id);
    res.send(`Deleted station with ID: ${id}`);
});

export default router;