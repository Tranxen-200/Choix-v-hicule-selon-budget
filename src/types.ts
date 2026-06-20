export interface Recommendation {
  brand: string;
  model: string;
  years: string;
  estimatedPrice: string;
  averageMileage: string;
  fuelType: string;
  transmission: string;
  power: string;
  score: number;
  whyMatch: string;
  highlights: string[];
  drawbacks: string[];
  consumption: string;
  critAir: string;
  annualCost: string;
  marketSituation: string;
}

export type BudgetType = "cash" | "leasing";

export interface QuestionnaireState {
  budgetType: BudgetType;
  budgetAmount: number;
  condition: "new" | "used" | "any";
  vehicleType: string;
  usage: string;
  fuel: string;
  seats: number;
  transmission: string;
  priority: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "advisor";
  text: string;
  timestamp: string;
}
