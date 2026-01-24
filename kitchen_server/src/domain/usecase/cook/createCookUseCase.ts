import { randomUUID } from "crypto";
import { CookRepository } from "../../repository/cookRepository.js";

export interface CreateCookUseCase {
    execute(id: string | null, name: string | null): Promise<void>;
}

export class CreateCookUseCaseImpl implements CreateCookUseCase {
    cookRepository: CookRepository;

    constructor(cookRepository: CookRepository) {
        this.cookRepository = cookRepository;
    }

    async execute(id: string | null, name: string | null): Promise<void> {
        const cookId = id ?? randomUUID();
        const cookName = name ?? `cook-${cookId}`;

        await this.cookRepository.createCook(cookId, cookName);
    }
}