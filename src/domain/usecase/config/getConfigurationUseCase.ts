import type { Configuration } from "../../../di/configuration.js";

export interface GetConfigurationUseCase {
    execute(): Configuration;
}

export class GetConfigurationUseCaseImpl implements GetConfigurationUseCase {
    private config: Configuration;

    constructor(config: Configuration) {
        this.config = config;
    }

    execute(): Configuration {
        return this.config;
    }
}
