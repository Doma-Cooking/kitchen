import type { RepoConfig } from "../../../di/configuration.js";
import type { GetConfigurationUseCase } from "./getConfigurationUseCase.js";

export interface GetRepoConfigUseCase {
    execute(owner: string, name: string): RepoConfig | undefined;
}

export class GetRepoConfigUseCaseImpl implements GetRepoConfigUseCase {
    private getConfiguration: GetConfigurationUseCase;

    constructor(getConfiguration: GetConfigurationUseCase) {
        this.getConfiguration = getConfiguration;
    }

    execute(owner: string, name: string): RepoConfig | undefined {
        const config = this.getConfiguration.execute();
        return config.repos.find(r => r.owner === owner && r.name === name);
    }
}
