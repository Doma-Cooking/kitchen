import { Recipe } from "./recipe.js";

export interface Cookbook {
    id: string;
    name: string;
    description: string;
    recipes: Map<string, Recipe<object, object>>;
}