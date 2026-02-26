import { Cookbook } from "../../interface/cookbook.js";
import { Recipe } from "../../interface/recipe.js";
import { beginPlanningRecipe } from "../recipe/beginPlanningRecipe.js";
import { feedbackPlanningRecipe } from "../recipe/feedbackPlanningRecipe.js";
import { beginImplementationRecipe } from "../recipe/beginImplementationRecipe.js";
import { feedbackImplementationRecipe } from "../recipe/feedbackImplementationRecipe.js";
import { createSubIssuesRecipe } from "../recipe/createSubIssuesRecipe.js";
import { resolveOrderRecipe } from "../recipe/resolveOrderRecipe.js";

export const domaCookbook: Cookbook = {
    id: "domaCookbook",
    name: "Doma Cookbook",
    description: "A cookbook containing recipes for Doma Cooking operations.",
    recipes: new Map<string, Recipe<object, object>>([
        ["domaBeginPlanningRecipe", beginPlanningRecipe],
        ["domaFeedbackPlanningRecipe", feedbackPlanningRecipe],
        ["domaBeginImplementationRecipe", beginImplementationRecipe],
        ["domaFeedbackImplementationRecipe", feedbackImplementationRecipe],
        ["domaCreateSubIssuesRecipe", createSubIssuesRecipe],
        ["domaResolveOrderRecipe", resolveOrderRecipe]
    ])
};