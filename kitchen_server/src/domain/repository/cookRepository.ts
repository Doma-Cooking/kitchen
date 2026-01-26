import { concatMap, lastValueFrom } from 'rxjs';
import { toStationEntity, toStationModel, StationRepository } from 'kitchen_station';
import { CookSource } from '../../data/source/cook/cookSource.js';
import { OrderSource } from '../../data/source/order/orderSource.js';
import { TaskModel } from '../../data/model/taskModel.js';

export interface CookRepository {
    createCook(id: string): Promise<void>;
}

export class CookRepositoryImpl implements CookRepository {
    private cookSource: CookSource;
    private orderSource: OrderSource;
    private stationRepository: StationRepository;

    constructor(
        cookSource: CookSource,
        orderSource: OrderSource,
        stationRepository: StationRepository
    ) {
        this.cookSource = cookSource;
        this.orderSource = orderSource;
        this.stationRepository = stationRepository;
    }

    async createCook(id: string): Promise<void> {
        await this.orderSource.createCook(
            id,
            async (order, signal) => {
                const station = order.stationId ? (await this.stationRepository.getStationById(order.stationId)) ?? (await this.stationRepository.createStation(order.stationId)) : null;
                const task: TaskModel = { order: order, station: station ? toStationModel(station) : null };
                const observable = this.cookSource.executeOrder(task, signal);

                const processed = observable.pipe(
                    concatMap(async messageModel => {
                        switch (messageModel.type) {
                            case 'status':
                                await this.orderSource.addOrderMessage(order.id, messageModel);
                                break;
                            case 'station':
                                await this.stationRepository.updateStation(toStationEntity(messageModel.station));
                                break;
                        }
                    })
                );

                await lastValueFrom(processed);
            }
        );
    }
}
