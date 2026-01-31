import { Router } from 'express';
import { stationDependencies } from 'kitchen_station';

const router = Router();

router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    await stationDependencies.deleteStationUseCase.execute(id);
    res.send(`Deleted station with ID: ${id}`);
});

export default router;