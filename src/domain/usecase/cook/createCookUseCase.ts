import { randomUUID } from "crypto";
import { CookRepository } from "../../repository/cookRepository.js";

export interface CreateCookUseCase {
    execute(queueName: string, id?: string): Promise<void>;
}

export class CreateCookUseCaseImpl implements CreateCookUseCase {
    cookRepository: CookRepository;

    constructor(cookRepository: CookRepository) {
        this.cookRepository = cookRepository;
    }

    async execute(queueName: string, id?: string): Promise<void> {
        const cookId = id ?? randomUUID();

        await this.cookRepository.createCook(cookId, queueName);
    }
}
