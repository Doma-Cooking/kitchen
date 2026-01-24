import { Observable } from 'rxjs';
import { CookMessageModel } from '../../model/cookMessageModel.js';
import { TaskModel } from '../../model/taskModel.js';

export interface CookSource {
    executeOrder(task: TaskModel, signal: AbortSignal | undefined): Observable<CookMessageModel>;
}
