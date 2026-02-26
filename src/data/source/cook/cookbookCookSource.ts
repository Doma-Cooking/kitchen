import { Observable } from "rxjs";
import type { Configuration } from "../../../di/configuration.js";
import type { Cookbook } from "../../../cookbook/interface/cookbook.js";
import { CookMessageModel } from "../../model/cookMessageModel.js";
import { OrderModel } from "../../model/orderModel.js";
import { CookSource } from "./cookSource.js";

export class CookbookCookSource implements CookSource {
  private cookbook: Cookbook;
  private config: Configuration;

  constructor(cookbook: Cookbook, config: Configuration) {
    this.cookbook = cookbook;
    this.config = config;
  }

  executeOrder(order: OrderModel, signal?: AbortSignal): Observable<CookMessageModel> {
    return new Observable<CookMessageModel>(observer => {
      const recipe = this.cookbook.recipes.get(order.recipeId);
      if (!recipe) {
        observer.error(new Error(`Recipe not found: ${order.recipeId}`));
        observer.complete();
      } else {
        observer.next({ message: `Starting order ${order.id}`, timestamp: new Date() });
        recipe.execute(
          order.input ?? {},
          this.config,
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
