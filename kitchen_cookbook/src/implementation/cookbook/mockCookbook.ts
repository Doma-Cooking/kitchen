import { Cookbook } from "../../interface/cookbook.js";
import { mockRecipe } from "../recipe/mockRecipe.js";

export const mockCookbook: Cookbook = {
    id: "mockCookbook",
    name: "Mock Cookbook",
    description: "A cookbook containing mock recipes for testing purposes.",
    recipes: new Map([["mockRecipe", mockRecipe]])
};