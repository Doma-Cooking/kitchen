import { Cookbook } from "../../interface/cookbook.js";
import { beginPlanningRecipe } from "../recipe/beginPlanningRecipe.js";
import { feedbackPlanningRecipe } from "../recipe/feedbackPlanningRecipe.js";

export const domaCookbook: Cookbook = {
    id: "domaCookbook",
    name: "Doma Cookbook",
    description: "A cookbook containing recipes for Doma Cooking operations.",
    recipes: new Map([
        ["domaBeginPlanningRecipe", beginPlanningRecipe],
        ["domaFeedbackPlanningRecipe", feedbackPlanningRecipe]
    ])
};