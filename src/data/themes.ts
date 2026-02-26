export interface RankDetails {
  name: string;
  image: string;
  femaleImage?: string;
  description: string;
}

export interface Theme {
  displayName: string;
  emoji?: string;
  colorClass?: string;
  progressGradient?: string; // New field for XP bar
  ranks: {
    [key: string]: RankDetails;
  };
}

export const THEMES: { [key: string]: Theme } = {

  athlete: {
    displayName: "Athlete",
    emoji: "🏃",
    colorClass: "bg-zinc-900",
    progressGradient: "from-orange-600 to-red-600",
    ranks: {
      level5: {
        name: "Level 5: Legend",
        image: "/themes/athlete/male/level5.png",
        femaleImage: "/themes/athlete/female/level5.png",
        description: "A HALL OF FAMER. Your performance is historic. You set the standard that others chase."
      },
      level4: {
        name: "Level 4: Champion",
        image: "/themes/athlete/male/level4.png",
        femaleImage: "/themes/athlete/female/level4.png",
        description: "AT THE PEAK. You don't just compete; you win. You are operating at elite levels."
      },
      level3: {
        name: "Level 3: Pro",
        image: "/themes/athlete/male/level3.png",
        femaleImage: "/themes/athlete/female/level3.png",
        description: "THE REAL DEAL. Highly skilled, consistent, and respected. You are a serious competitor."
      },
      level2: {
        name: "Level 2: Contender",
        image: "/themes/athlete/male/level2.png",
        femaleImage: "/themes/athlete/female/level2.png",
        description: "IN THE HUNT. You have the skills to make waves and challenge those above you."
      },
      level1: {
        name: "Level 1: Amateur",
        image: "/themes/athlete/male/level1.png",
        femaleImage: "/themes/athlete/female/level1.png",
        description: "LEARNING THE ROPES. You are in the game, building your fundamentals and gaining experience."
      },
      level0: {
        name: "Level 0: Rookie",
        image: "/themes/athlete/male/level0.png",
        femaleImage: "/themes/athlete/female/level0.png",
        description: "UNTESTED POTENTIAL. You have signed up, but you haven't stepped onto the field yet."
      },
    },
  },

  dragon: {
    displayName: "Draconic",
    emoji: "🐉",
    colorClass: "bg-red-950",
    progressGradient: "from-red-600 to-orange-600",
    ranks: {
      level5: { name: "Level 5: Archdragon", image: "/themes/dragon/level5.png", description: "A FORCE OF NATURE. Ancient, massive, and practically invincible." },
      level4: { name: "Level 4: Elder Dragon", image: "/themes/dragon/level4.png", description: "LEGENDARY BEAST. Your scales are iron and your breath is fire." },
      level3: { name: "Level 3: Dragon", image: "/themes/dragon/level3.png", description: "TERRIFYING. A fully grown predator of the skies." },
      level2: { name: "Level 2: Drake", image: "/themes/dragon/level2.png", description: "DANGEROUS. Wingless but strong. You are a threat, but grounded." },
      level1: { name: "Level 1: Hatchling", image: "/themes/dragon/level1.png", description: "JUST HATCHED. Small, fragile, and full of potential." },
      level0: { name: "Level 0: Egg", image: "/themes/dragon/level0.png", description: "DORMANT. Waiting to wake up." },
    },
  },

  // --- THEME 3: SAMURAI ---
  samurai: {
    displayName: "Samurai",
    emoji: "⚔️",
    colorClass: "bg-red-900",
    progressGradient: "from-red-700 to-rose-600",
    ranks: {
      level5: { name: "Level 5: Shogun", image: "/themes/samurai/level5.png", description: "SUPREME RULER. Your word is law. Unmatched power and command." },
      level4: { name: "Level 4: Daimyo", image: "/themes/samurai/level4.png", description: "WARLORD. You command armies and shape the battlefield." },
      level3: { name: "Level 3: Samurai", image: "/themes/samurai/level3.png", description: "WARRIOR. Sworn to duty. Your blade is an extension of your soul." },
      level2: { name: "Level 2: Ronin", image: "/themes/samurai/level2.png", description: "WANDERER. Masterless and free. You rely only on your own strength." },
      level1: { name: "Level 1: Ashigaru", image: "/themes/samurai/level1.png", description: "FOOT SOLDIER. One of many. Your spear is sharp, but untested." },
      level0: { name: "Level 0: Peasant", image: "/themes/samurai/level0.png", description: "VILLAGER. Humble beginnings. Unaware of the warrior's path." },
    },
  },

  // --- THEME 5: DINOSAUR ---
  dinosaur: {
    displayName: "Apex Predator",
    emoji: "🦖",
    colorClass: "bg-emerald-950",
    progressGradient: "from-emerald-600 to-green-500",
    ranks: {
      level5: { name: "Level 5: Spinosaurus", image: "/themes/dinosaur/level5.png", description: "THE COLOSSUS. The largest predator to ever walk or swim. Master of two realms." }, // Updated to Spinosaurus per your image request context, usually Titanosaur/Rex but flexible!
      level4: { name: "Level 4: T-Rex", image: "/themes/dinosaur/level4.png", description: "TYRANT KING. Your bite force crushes bone. When you roar, the world listens." },
      level3: { name: "Level 3: Allosaurus", image: "/themes/dinosaur/level3.png", description: "JURASSIC DOMINATOR. Before the Tyrant, you ruled. Agile, vicious, and relentless in the hunt." },
      level2: { name: "Level 2: Raptor", image: "/themes/dinosaur/level2.png", description: "CLEVER GIRL. Fast, aggressive, and lethal in a pack." },
      level1: { name: "Level 1: Compy", image: "/themes/dinosaur/level1.png", description: "SCAVENGER. Small, fast, and unnoticed. You survive by staying out of the way." },
      level0: { name: "Level 0: Fossil", image: "/themes/dinosaur/level0.png", description: "BURIED. Waiting to be discovered." },
    },
  },

  // --- THEME 8: VIKING ---
  viking: {
    displayName: "Viking",
    emoji: "🪓",
    colorClass: "bg-sky-950",
    progressGradient: "from-cyan-600 to-blue-600",
    ranks: {
      level5: { name: "Level 5: Vikingur", image: "/themes/viking/level5.png", description: "THE MOST ELITE. Rare and respected." },
      level4: { name: "Level 4: Fullsterkur", image: "/themes/viking/level4.png", description: "A MAN AMONGST MEN. Fully prepared." },
      level3: { name: "Level 3: Sterkur", image: "/themes/viking/level3.png", description: "A CAPABLE MAN. Holds his own." },
      level2: { name: "Level 2: Halfsterkur", image: "/themes/viking/level2.png", description: "STRONG ENOUGH TO GET NOTICED. NOT STRONG ENOUGH TO BE TRUSTED" },
      level1: { name: "Level 1: Lazy Bones", image: "/themes/viking/level1.png", description: "UNFIT FOR THE SEA. Starting line." },
      level0: { name: "Level 0: Thrall", image: "/themes/viking/level0.png", description: "UNTESTED. Not yet proven." },
    },
  },
};