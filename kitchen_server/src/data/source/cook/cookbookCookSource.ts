import { Observable } from "rxjs";
import { Cookbook } from "kitchen_cookbook";
import { CookMessageModel } from "../../model/cookMessageModel.js";
import { OrderModel } from "../../model/orderModel.js";
import { CookSource } from "./cookSource.js";

export class CookbookCookSource implements CookSource {
    private cookbook: Cookbook;

    constructor(cookbook: Cookbook) {
        this.cookbook = cookbook;
    }

    executeOrder(order: OrderModel, signal?: AbortSignal): Observable<CookMessageModel> {
        return new Observable<CookMessageModel>(observer => {
            const recipe = this.cookbook.recipes.get(order.recipeId);
            if (!recipe) {
                observer.error(new Error(`Recipe not found: ${order.recipeId}`));
                observer.complete();
            } else {
                observer.next({
                    message: `Starting order ${order.id} with input: ${JSON.stringify(order.input)}`,
                    timestamp: new Date()
                });
                recipe.execute(
                    order.input ?? {},
                    (message: string) => {
                        observer.next({
                            message,
                            timestamp: new Date()
                        });
                    },
                    signal
                ).then((output) => {
                    observer.next({
                        message: `Order ${order.id} completed with output: ${JSON.stringify(output)}`,
                        timestamp: new Date()
                    });
                    observer.complete();
                }).catch((err: unknown) => {
                    observer.error(err);
                    observer.complete();
                });
            }
        });
    }
}