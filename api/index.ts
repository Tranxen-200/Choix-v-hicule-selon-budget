import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Lazy getter for Gemini GoogleGenAI client to avoid crash on load if API key is not present
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Interfaces for user query
interface RecommendationQuery {
  budgetType: "cash" | "leasing";
  budgetAmount: number;
  condition: "new" | "used" | "any";
  vehicleType: string;
  usage: string;
  fuel: string;
  seats: number;
  transmission: string;
  priority: string;
}

// Detailed fallback catalog for offline or non-API key situations
const FALLBACK_CARS = [
  {
    brand: "Peugeot",
    model: "208 II",
    years: "2019 - 2024",
    estimatedPrice: "13 500 €",
    averageMileage: "45 000 km",
    fuelType: "Essence ou Électrique (e-208)",
    transmission: "Boite Manuelle ou Auto",
    power: "100 - 136 ch",
    score: 98,
    whyMatch: "Parfaite pour un budget intermédiaire. Style moderne, tableau de bord 3D novateur et d'excellentes qualités dynamiques pour un usage quotidien polyvalent.",
    highlights: ["Design moderne et agressif", "Excellente revente en France", "Consommation maîtrisée (5.1 l/100)"],
    drawbacks: ["Places arrière un peu étriquées", "Écran tactile de première génération perfectible"],
    consumption: "5.1 L / 100km (ou 16 kWh/100)",
    critAir: "1 (ou 0 Électrique)",
    annualCost: "1 750 €",
    marketSituation: "Très disponible en occasion récente. Privilégiez les motorisations essence PureTech fabriquées après 2020 ou l'alternative électrique 136ch.",
    vehicleTypeClass: "compacte",
    bestForUsage: ["commute_city", "commute_highway", "occasional"],
    compatibleBudgets: [10000, 25000],
    compatibleLeasing: [150, 300]
  },
  {
    brand: "Dacia",
    model: "Sandero III Eco-G",
    years: "2021 - 2026",
    estimatedPrice: "11 900 €",
    averageMileage: "30 000 km",
    fuelType: "GPL / Essence (Eco-G 100)",
    transmission: "Boite Manuelle",
    power: "100 ch",
    score: 95,
    whyMatch: "Le choix pragmatique par excellence. Fonctionne au GPL à moins de 1€ le litre, offrant un coût au kilomètre imbattable tout en étant une voiture très récente.",
    highlights: ["Coût carburant imbattable grâce au GPL", "Fiabilité mécanique remarquable", "Volume de coffre très généreux"],
    drawbacks: ["Finition intérieure spartiate", "Insonorisation sur autoroute moyenne"],
    consumption: "6.8 L / 100km (GPL bon marché)",
    critAir: "1",
    annualCost: "1 100 €",
    marketSituation: "Très recherchée sur le marché de l'occasion. Conserve extrêmement bien sa valeur, coût d'assurance minime.",
    vehicleTypeClass: "compacte",
    bestForUsage: ["commute_city", "commute_highway", "occasional", "professional"],
    compatibleBudgets: [8000, 18000],
    compatibleLeasing: [100, 250]
  },
  {
    brand: "Renault",
    model: "Captur II",
    years: "2020 - 2025",
    estimatedPrice: "16 800 €",
    averageMileage: "40 000 km",
    fuelType: "Hybride (E-Tech 145)",
    transmission: "Automatique intelligente",
    power: "145 ch",
    score: 96,
    whyMatch: "Un SUV urbain polyvalent avec une assise haute fort confortable. Son système hybride se recharge seul et réduit drastiquement la consommation en ville.",
    highlights: ["Habitabilité modulable (banquette coulissante)", "Position de conduite haute rassurant", "Douceur de la motorisation hybride"],
    drawbacks: ["Insonorisation parfois perfectible en accélération", "Volume coffre amputé sur version hybride"],
    consumption: "4.8 L / 100km",
    critAir: "1",
    annualCost: "1 600 €",
    marketSituation: "Large choix disponible en concessions. Privilégiez l'excellente version E-Tech hybride ou le TCe 140 essence.",
    vehicleTypeClass: "suv",
    bestForUsage: ["commute_city", "commute_highway", "family"],
    compatibleBudgets: [14000, 26000],
    compatibleLeasing: [200, 400]
  },
  {
    brand: "Tesla",
    model: "Model 3 SR+",
    years: "2019 - 2022",
    estimatedPrice: "24 900 €",
    averageMileage: "75 000 km",
    fuelType: "Électrique",
    transmission: "Automatique mono-rapport",
    power: "275 ch (propulsion)",
    score: 97,
    whyMatch: "Pour les budgets plus confortables recherchant de la technologie. Réseau de superchargeurs d'excellence, coût de recharge dérisoire à domicile et aucun entretien requis.",
    highlights: ["Technologie embarquée et Autopilot", "Accélérations fulgurantes", "Réseau de Superchargeurs unique"],
    drawbacks: ["Insonorisation moyenne sur les premiers modèles", "Pas de hayon (coffre classique)"],
    consumption: "14.5 kWh / 100km",
    critAir: "0",
    annualCost: "850 €",
    marketSituation: "Prix très stabilisés. Beaucoup d'importations européennes saines. Vérifiez l'état général de la batterie (SOH) via le menu de service.",
    vehicleTypeClass: "berline",
    bestForUsage: ["commute_city", "commute_highway", "family", "professional"],
    compatibleBudgets: [20000, 45000],
    compatibleLeasing: [280, 550]
  },
  {
    brand: "Toyota",
    model: "Yaris III Hybrid",
    years: "2015 - 2020",
    estimatedPrice: "9 800 €",
    averageMileage: "85 000 km",
    fuelType: "Hybride auto-rechargeable",
    transmission: "Variation continue (e-CVT)",
    power: "100 ch",
    score: 94,
    whyMatch: "La reine de la ville et de la fiabilité. Consomme moins de 4L en ville, crit'Air 1 d'office, fabriquée en France et réputée indestructible.",
    highlights: ["Fiabilité légendaire (pas d'embrayage, pas de démarreur)", "Consommation urbaine minimale", "Crit'Air 1 permanent"],
    drawbacks: ["Insonorisation sur autoroute (effet patinage e-CVT)", "Style intérieur légèrement daté"],
    consumption: "3.9 L / 100km",
    critAir: "1",
    annualCost: "1 250 €",
    marketSituation: "Extrêmement facile à trouver et à revendre. L'historique d'entretien annuel 'Bilan Hybride Toyota' prolonge la garantie de la batterie.",
    vehicleTypeClass: "citadine",
    bestForUsage: ["commute_city", "occasional"],
    compatibleBudgets: [7000, 13000],
    compatibleLeasing: [100, 200]
  },
  {
    brand: "Dacia",
    model: "Duster II",
    years: "2018 - 2023",
    estimatedPrice: "12 900 €",
    averageMileage: "65 000 km",
    fuelType: "GPL / Essence ou Diesel (dCi)",
    transmission: "Manuelle 6 rapports",
    power: "100 - 115 ch",
    score: 93,
    whyMatch: "Le SUV idéal pour la campagne, la montagne ou les chemins. Extrêmement robuste, suspendu confortablement et disponible en vraie version 4 roues motrices.",
    highlights: ["Excellentes aptitudes tous chemins", "Très bon confort de suspension", "Prix d'entretien très modéré"],
    drawbacks: ["Finition plastique dur sensible aux rayures", "Insonorisation perfectible à 130 km/h"],
    consumption: "6.2 L / 100km",
    critAir: "1 ou 2",
    annualCost: "1 550 €",
    marketSituation: "Succès d'occasion fulgurant. Les versions 4x4 dCi 115 conservent une cote très élevée dans les régions montagneuses.",
    vehicleTypeClass: "suv",
    bestForUsage: ["rugged", "family", "occasional"],
    compatibleBudgets: [9000, 18000],
    compatibleLeasing: [150, 280]
  },
  {
    brand: "Renault",
    model: "Clio IV",
    years: "2015 - 2019",
    estimatedPrice: "7 800 €",
    averageMileage: "95 000 km",
    fuelType: "Essence (TCe 90)",
    transmission: "Manuelle 5 rapports",
    power: "90 ch",
    score: 92,
    whyMatch: "Parfaite pour un jeune conducteur ou un petit budget. Look toujours d'actualité, pièces détachées très peu chères et comportement routier hyper sécurisant.",
    highlights: ["Lignes sensuelles toujours modernes", "Entretien économique chez n'importe quel garagiste", "Châssis très sain et confortable"],
    drawbacks: ["Plastiques intérieurs durs avec bruits parasites", "Écran tactile de première génération lent"],
    consumption: "5.4 L / 100km",
    critAir: "1",
    annualCost: "1 400 €",
    marketSituation: "Disponible en quantité colossale. Privilégiez le moteur essence 0.9 TCe 90, ou le diesel dCi 90 si vous roulez plus de 20 000 km par an.",
    vehicleTypeClass: "citadine",
    bestForUsage: ["commute_city", "occasional"],
    compatibleBudgets: [5000, 10000],
    compatibleLeasing: [80, 160]
  },
  {
    brand: "Peugeot",
    model: "3008 II",
    years: "2017 - 2022",
    estimatedPrice: "14 900 €",
    averageMileage: "80 000 km",
    fuelType: "Diesel ou Essence (BlueHDi / PureTech)",
    transmission: "Automatique EAT8 (ou Manuelle)",
    power: "130 ch",
    score: 91,
    whyMatch: "Un habitacle digne d'un cockpit d'avion et un coffre spacieux de 520 litres. Il offre un excellent dynamisme de route pour une famille aimant voyager.",
    highlights: ["Insonorisation et confort haut de gamme", "Cockpit i-Cockpit futuriste", "Comportement routier très dynamique"],
    drawbacks: ["Recommandation de surveillance de la courroie sur PureTech", "Confort de suspension un peu ferme"],
    consumption: "5.3 L / 100km",
    critAir: "1 ou 2",
    annualCost: "1 900 €",
    marketSituation: "La coqueluche des français. Les versions BlueHDi 130 ou hybrides rechargeables pullulent. Faites valider l'historique de révision rigoureux.",
    vehicleTypeClass: "suv",
    bestForUsage: ["family", "commute_highway", "professional"],
    compatibleBudgets: [11000, 24000],
    compatibleLeasing: [180, 350]
  }
];

// Helper to calculate score of fallback vehicles
function calculateFallbackScore(car: typeof FALLBACK_CARS[0], q: RecommendationQuery): number {
  let score = 85; // base score

  // 1. Budget checking
  let isBudgetOk = false;
  const budget = q.budgetAmount;
  if (q.budgetType === "cash") {
    const [min, max] = car.compatibleBudgets;
    if (budget >= min - 1500 && budget <= max + 5000) {
      isBudgetOk = true;
    }
    if (budget >= min && budget <= max) {
      score += 5;
    }
  } else {
    const [min, max] = car.compatibleLeasing;
    if (budget >= min - 50 && budget <= max + 100) {
      isBudgetOk = true;
    }
    if (budget >= min && budget <= max) {
      score += 5;
    }
  }

  if (!isBudgetOk) {
    score -= 20;
  }

  // 2. Vehicle type match
  if (q.vehicleType !== "any" && q.vehicleType.toLowerCase() === car.vehicleTypeClass.toLowerCase()) {
    score += 8;
  }

  // 3. Usage match
  if (car.bestForUsage.includes(q.usage)) {
    score += 5;
  }

  // 4. Fuel type
  if (q.fuel !== "any") {
    const fuelLower = car.fuelType.toLowerCase();
    const fuelTarget = q.fuel.toLowerCase();
    if (fuelLower.includes(fuelTarget)) {
      score += 5;
    } else if (fuelTarget === "hybride" && fuelLower.includes("hybrid")) {
      score += 5;
    } else if (fuelTarget === "electric" && (fuelLower.includes("électrique") || fuelLower.includes("electric"))) {
      score += 5;
    }
  }

  // 5. Seat layout
  if (q.seats > 5 && car.vehicleTypeClass !== "monospace" && car.vehicleTypeClass !== "suv") {
    score -= 10;
  }

  // 6. Transmission
  if (q.transmission !== "any") {
    const carTransLower = car.transmission.toLowerCase();
    if (q.transmission === "auto" && (carTransLower.includes("auto") || carTransLower.includes("continue"))) {
      score += 4;
    } else if (q.transmission === "manual" && carTransLower.includes("manuelle")) {
      score += 4;
    }
  }

  // 7. Condition match (neuf vs occasion)
  if (q.condition && q.condition !== "any") {
    const isNewCar = car.averageMileage.toLowerCase().includes("neuf") || car.years.includes("2024") || car.years.includes("2025") || car.years.includes("2026");
    if (q.condition === "new") {
      if (isNewCar) {
        score += 8;
      } else {
        score -= 20;
      }
    } else if (q.condition === "used") {
      if (!isNewCar) {
        score += 8;
      } else {
        score -= 25;
      }
    }
  }

  return Math.min(Math.max(score, 60), 99);
}

// REST route for recommendation
app.post("/api/recommend", async (req, res) => {
  const query = req.body as RecommendationQuery;
  const ai = getGeminiClient();

  if (!ai) {
    console.info("[API Serverless] Gemini API key not found. Executing advanced offline recommendation fallback.");
    const matches = FALLBACK_CARS.map(car => ({
      ...car,
      score: calculateFallbackScore(car, query)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

    return res.json({
      method: "database_match",
      recommendations: matches
    });
  }

  try {
    const isLeasing = query.budgetType === "leasing";
    const budgetContext = isLeasing 
      ? `un budget mensuel de LOA/LLD (Leasing) de environ ${query.budgetAmount} € par mois`
      : `un budget d'achat global (comptant ou crédit classique) de ${query.budgetAmount} €`;

    const conditionQueryText = query.condition === "new"
      ? "uniquement des véhicules NEUFS (ou de démonstration kilométrage proche de zéro)"
      : query.condition === "used"
        ? "uniquement des véhicules d'OCCASION (voitures usagées)"
        : "des véhicules neufs ou d'occasion selon l'adéquation au budget";

    const promptMessage = `En tant qu'expert conseiller en achat d'automobile, recommande exactement 3 à 4 véhicules parfaits (${conditionQueryText}) adaptés au marché français et européen.
L'acheteur a les caractéristiques suivantes :
- Budget: ${budgetContext}
- État souhaité du véhicule: ${query.condition === "new" ? "Neuf uniquement" : query.condition === "used" ? "Occasion uniquement" : "Neuf ou Occasion"}
- Silhouette préférée de véhicule: ${query.vehicleType} (Note: Si "any/peu importe", choisis celle qui est la plus appropriée à son profil)
- Type d'usage: ${query.usage} (valeurs possibles: commute_city (trajet travail ville), commute_highway (autoroute quotidien), family (longs voyages famille), occasional (loisirs weekend occasionnel), professional (usage pro intensif), rugged (montagne/chemins boueux))
- Carburant favori: ${query.fuel} (valeurs: essence, diesel, hybride, electric, ou any/peu importe)
- Nombre de places minimum requis: ${query.seats} places
- Boite de vitesse: ${query.transmission} (auto: automatique, manual: manuelle, any: peu importe)
- Priorité principale : ${query.priority} (ecology (écologie/critair), reliability (fiabilité mécanique/coût entretien minime), comfort (technologie et confort premium), performance (comportements/dynamisme), resale (facilité de revente))

ATTENTION TRÈS IMPORTANTE : Si l'acheteur demande un véhicule d'OCCASION (condition = used), NE PROPOSE PAS ET NE MENTIONNE AUCUN CALCUL OU OPTION EN LOA OU LLD (Leasing). Le leasing (LOA / LLD) est formellement interdit pour les véhicules d'occasion dans cette application. Si la condition est "occasion", l'achat se fera uniquement au comptant / crédit classique. Donc, ne parle pas d'offre LOA/LLD si le véhicule conseillé est d'occasion !

Formate la réponse sous forme de tableau JSON valide d'objets, contenant exactement le schéma demandé. Fais des suggestions réalistes sur le marché de l'automobile en France aujourd'hui. Fais attention à l'estimation des prix en accord avec le marché de l'occasion si le budget est réduit. Donne d'excellentes informations sur la fiabilité mécanique, la vignette Crit'Air et la consommation réelle de carburant.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        systemInstruction: "Tu es un SaaS premium de conseil auto 'Quel Véhicule Acheter ?'. Tu réponds toujours en JSON strict et valide. Ne mets pas de bloc de code markdown, uniquement la chaine JSON brute. Les textes doivent être rédigés en français impeccable et professionnel. Indique les budgets d'occasions réelles.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              brand: { type: Type.STRING, description: "Marque du véhicule (ex: Renault, Peugeot, Toyota)" },
              model: { type: Type.STRING, description: "Modèle précis (ex: Clio V, Captur E-Tech, Yaris Hybrid)" },
              years: { type: Type.STRING, description: "Tranche d'années de production recommandée (ex: 2019 - 2023)" },
              estimatedPrice: { type: Type.STRING, description: "Prix estimé sur le marché de l'occasion ou neuf (ex: 12 500 €)" },
              averageMileage: { type: Type.STRING, description: "Kilométrage moyen constaté pour ce budget (ex: 60 000 km, ou 'Neuf' si applicable)" },
              fuelType: { type: Type.STRING, description: "Carburant recommandé précis (ex: Hybride Essence, Diesel dCi, Électrique)" },
              transmission: { type: Type.STRING, description: "Transmission recommandée (ex: Manuelle 5 rapports, Automatique intelligente)" },
              power: { type: Type.STRING, description: "Puissance moteur recommandée (ex: 100 ch, 140 ch)" },
              score: { type: Type.NUMBER, description: "Score d'adéquation dynamique entre 60 et 99 calculé sur le profil de l'acheteur (ex: 97)" },
              whyMatch: { type: Type.STRING, description: "Explication claire et vendeuse de pourquoi ce véhicule correspond exactement à son profil et son budget (2-3 phrases en français)" },
              highlights: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Trois points forts majeurs du véhicule pour cet utilisateur"
              },
              drawbacks: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Deux points faibles ou vigilances importantes (ex: courroie de distribution, insonorisation à 130 km/h)"
              },
              consumption: { type: Type.STRING, description: "Consommation moyenne réelle (ex: 4.3 L / 100km, ou 15.2 kWh / 100km)" },
              critAir: { type: Type.STRING, description: "Vignette réglementaire Crit'Air (ex: Crit'Air 1, Crit'Air 0)" },
              annualCost: { type: Type.STRING, description: "Coût d'usage annuel estimé : carburant + entretien + assurance moyenne (ex: 1 450 € / an)" },
              marketSituation: { type: Type.STRING, description: "Conseil malin d'expert pour l'acheter sur le marché français (ex: éviter les versions d'avant 2018, privilégier le réseau de marque avec garantie)" }
            },
            required: [
              "brand", "model", "years", "estimatedPrice", "averageMileage", 
              "fuelType", "transmission", "power", "score", "whyMatch", 
              "highlights", "drawbacks", "consumption", "critAir", "annualCost", "marketSituation"
            ]
          }
        }
      }
    });

    const textResponse = response.text?.trim() || "[]";
    const parsedData = JSON.parse(textResponse);

    return res.json({
      method: "gemini_generation",
      recommendations: parsedData
    });

  } catch (error: any) {
    console.error("Gemini Advisor service failed:", error);
    const matches = FALLBACK_CARS.map(car => ({
      ...car,
      score: calculateFallbackScore(car, query)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

    return res.json({
      method: "database_match_after_error",
      error: error.message,
      recommendations: matches
    });
  }
});

// Interactive AI chat assistant endpoint for follow-up questions
app.post("/api/chat", async (req, res) => {
  const { messages, selectedCar } = req.body;
  const ai = getGeminiClient();

  const latestMessage = messages && messages.length > 0 ? messages[messages.length - 1].text : "";
  const carName = selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : "le véhicule sélectionné";

  if (!ai) {
    console.info("[API Serverless] Gemini API key not found. Answering with offline rules engine.");
    let answer = `[Conseil Expert] Concernant la ${carName} : `;
    const qLower = latestMessage.toLowerCase();

    if (qLower.includes("fiab") || qLower.includes("courroie") || qLower.includes("panne") || qLower.includes("problem")) {
      answer += `La fiabilité globale de ce modèle est réputée très correcte, mais quelques points de vigilance s'imposent. S'il s'agit d'un moteur PureTech essence, assurez-vous que la courroie de distribution lubrifiée sous carter a été inspectée ou changée récemment. Pour les versions hybrides ou électriques, demandez un rapport officiel d'état de santé de la batterie (SOH).`;
    } else if (qLower.includes("assurance") || qLower.includes("cher") || qLower.includes("budget") || qLower.includes("prix")) {
      answer += `Au niveau de l'assurance, la ${carName} se situe dans une catégorie d'assurance modérée (moyen de 4 à 6 CV fiscaux). L'entretien régulier dans le réseau de la marque est d'environ 150€ à 300€ par an. C'est un véhicule économiquement très rationnel à posséder.`;
    } else if (qLower.includes("conso") || qLower.includes("essence") || qLower.includes("autonomie") || qLower.includes("carburant")) {
      answer += `Sur le plan de l'usage, ce type de motorisation montre une efficacité remarquable. Comptez une consommation moyenne de l'ordre de ${selectedCar?.consumption || "5.0 L / 100km"}. C'est idéal pour réduire vos factures de carburant face à l'inflation.`;
    } else if (qLower.includes("famille") || qLower.includes("place") || qLower.includes("coffre") || qLower.includes("siege")) {
      answer += `L'habitabilité à bord est optimisée pour son gabarit. Le volume de coffre convient parfaitement pour les courses hebdomadaires et les bagages de week-end. Les passagers arrière apprécieront la garde au toit, bien qu'il ne s'agisse pas d'un grand monospace de voyage.`;
    } else if (qLower.includes("bonjour") || qLower.includes("salut") || qLower.includes("hello")) {
      answer = `Bonjour ! Je suis votre conseiller automobile virtuel. Que puis-je vous dire de particulier sur la ${carName} pour vous aider à vous décider ? Fiabilité, frais annuels, assurance ou conseils d'achat... Posez-moi vos questions !`;
    } else {
      answer += `C'est un excellent choix d'achat ! Pour ce budget, il offre un des meilleurs rapports qualité/prix du marché. Je vous recommande de l'essayer en version ${selectedCar?.transmission || "boite auto"} et de vérifier fidèlement son carnet d'entretien numérique Histovec avant de signer.`;
    }

    return res.json({
      reply: answer
    });
  }

  try {
    const systemPrompt = `Tu es l'expert-conseil automobile en ligne de la plateforme SaaS premium 'Quel Véhicule Acheter ?'.
Tu as face à toi un utilisateur qui étudie et pose des questions sur : ${carName}.
Détails de ce véhicule :
- Marque & Modèle: ${carName}
- Années recommandées: ${selectedCar?.years || "N/A"}
- Estimation prix: ${selectedCar?.estimatedPrice || "N/A"} (Milieu d'occasion ou neuf)
- Kilométrage estimé: ${selectedCar?.averageMileage || "N/A"}
- Motorisation: ${selectedCar?.fuelType || "N/A"} (${selectedCar?.power || "N/A"})
- Transmission: ${selectedCar?.transmission || "N/A"}
- Points forts: ${selectedCar?.highlights?.join(", ") || "N/A"}
- Points faibles/Vigilance: ${selectedCar?.drawbacks?.join(", ") || "N/A"}
- Consommation réelle: ${selectedCar?.consumption || "N/A"}
- Vignette Crit'Air: ${selectedCar?.critAir || "N/A"}
- Coût d'usage estimé: ${selectedCar?.annualCost || "N/A"}
- Recommandation d'achat de l'expert: ${selectedCar?.marketSituation || "N/A"}

Réponds à la question de manière professionnelle, chaleureuse, précise et synthétique (pas plus de 3-4 lignes). Parle de fiabilité, de coûts annexes, d'assurance ou de revente en te basant sur le marché automobile français. Reste de très bon conseil pour un particulier.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Voici la discussion. Question finale de l'utilisateur: "${latestMessage}"`,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    const reply = response.text?.trim() || "Désolé, je ne parviens pas à analyser votre message actuellement.";
    return res.json({ reply });

  } catch (error: any) {
    console.error("Gemini Chat Adviser failed:", error);
    return res.json({
      reply: `Je valide le choix de la ${carName} ! C'est un véhicule d'excellente facture. Avez-vous d'autres questions sur l'assurance ou l'entretien ?`
    });
  }
});

export default app;
