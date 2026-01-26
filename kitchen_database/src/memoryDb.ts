import { BehaviorSubject } from 'rxjs';

export class MemoryDb {
    stations: BehaviorSubject<Map<string, string>> = new BehaviorSubject<Map<string, string>>(new Map());
    orders: BehaviorSubject<Map<string, string>> = new BehaviorSubject<Map<string, string>>(new Map());
}
