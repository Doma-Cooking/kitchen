import { Router } from 'express';

const router = Router();

router.post('/:id/perform', (req, res) => {
    const id = req.params.id;
    res.send(`Running task with ID: ${id}`);
});

router.post('/:id/cleanup', (req, res) => {
    const id = req.params.id;
    res.send(`Cleaning up task with ID: ${id}`);
});

export default router;