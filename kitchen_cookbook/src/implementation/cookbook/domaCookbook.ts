import { Cookbook } from "../../interface/cookbook.js";
import { beginPlanningRecipe } from "../recipe/beginPlanningRecipe.js";
import { feedbackPlanningRecipe } from "../recipe/feedbackPlanningRecipe.js";
import { beginImplementationRecipe } from "../recipe/beginImplementationRecipe.js";
import { feedbackImplementationRecipe } from "../recipe/feedbackImplementationRecipe.js";
import { createSubIssuesRecipe } from "../recipe/createSubIssuesRecipe.js";

export const domaCookbook: Cookbook = {
    id: "domaCookbook",
    name: "Doma Cookbook",
    description: "A cookbook containing recipes for Doma Cooking operations.",
    recipes: new Map([
        ["domaBeginPlanningRecipe", beginPlanningRecipe],
        ["domaFeedbackPlanningRecipe", feedbackPlanningRecipe],
        ["domaBeginImplementationRecipe", beginImplementationRecipe],
        ["domaFeedbackImplementationRecipe", feedbackImplementationRecipe],
        ["domaCreateSubIssuesRecipe", createSubIssuesRecipe]
    ])
};