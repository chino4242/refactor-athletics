import { CatalogItem } from '@/types';

function findXpFactor(exerciseName: string, catalog: CatalogItem[]): number {
    const cleanName = exerciseName.replace(/^\d+\.\s*/, '').toLowerCase().trim();

    for (const item of catalog) {
        if (item.name.toLowerCase() === cleanName) {
            return item.xp_factor || 0;
        }
    }

    // Fuzzy match (simplified intersection)
    let bestFactor = 0;
    let bestScore = 0;

    const queryTokens = new Set(cleanName.split(/\s+/));

    for (const item of catalog) {
        const catName = item.name.toLowerCase();
        const catTokens = new Set(catName.split(/\s+/));

        let intersection = 0;
        for (const token of catTokens) {
            if (queryTokens.has(token)) intersection++;
        }

        if (intersection > bestScore) {
            bestScore = intersection;
            bestFactor = item.xp_factor || 0;
        }
    }

    return bestScore >= 2 ? bestFactor : 0.5;
}

function parseTimeToSeconds(line: string): number | null {
    const colonMatch = line.match(/(\d{1,2}):(\d{2})/);
    if (colonMatch) {
        const minutes = parseInt(colonMatch[1], 10);
        const seconds = parseInt(colonMatch[2], 10);
        return (minutes * 60) + seconds;
    }

    const textMatch = line.match(/(\d+(\.\d+)?)\s*(min|sec)/i);
    if (textMatch) {
        const val = parseFloat(textMatch[1]);
        const unit = textMatch[3].toLowerCase();
        return unit.includes("min") ? Math.floor(val * 60) : Math.floor(val);
    }

    // Fallback: "30 push" or "45 AO" without explicit units (Assume seconds)
    const implicitMatch = line.match(/^(\d+)\s+(push|all out|ao|base|walk|wr)/i);
    if (implicitMatch) {
        return parseInt(implicitMatch[1], 10);
    }

    return null;
}

function getZoneAndColor(text: string): [string, string] {
    const lower = text.toLowerCase();
    if (lower.includes("base to push")) return ["Base to Push", "bg-gradient-to-r from-green-500 to-orange-500"];
    if (lower.includes("push to all out") || lower.includes("push to ao")) return ["Push to All Out", "bg-gradient-to-r from-orange-500 to-red-600"];
    if (lower.includes("base to all out") || lower.includes("base to ao")) return ["Base to All Out", "bg-gradient-to-r from-green-500 to-red-600"];
    if (lower.includes("all out") || lower.includes(" ao ") || lower.endsWith(" ao") || lower.startsWith("ao ")) return ["All Out", "bg-red-600"];
    if (lower.includes("push")) return ["Push Pace", "bg-orange-500"];
    if (lower.includes("base")) return ["Base Pace", "bg-green-500"];
    if (lower.includes("walking recovery") || lower.split(/\s+/).includes("wr")) return ["Walking Recovery", "bg-zinc-600 border border-zinc-500"];

    if (["surge", "climb", "uphill", "increase", "sprint"].some(x => lower.includes(x))) {
        if (lower.includes("sprint")) return ["Sprint", "bg-red-600"];
        return ["Instruction", "bg-orange-500"];
    }

    if (["jog", "tread", "steady", "warm"].some(x => lower.includes(x))) return ["Base Pace", "bg-green-500"];
    if (lower.includes("recover") || lower.includes("rest") || lower.includes("walk")) return ["Recovery", "bg-blue-900/40 text-blue-200"];

    return ["Instruction", "bg-zinc-800"];
}

function parseTreadmillSection(text: string, sectionName = "Engine"): any[] {
    const blocks: any[] = [];
    const lines = text.trim().split('\n');
    let currentBlock: any = null;

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('[')) continue;
        if (line.startsWith('---')) continue;

        // New Block Detection
        const isHeader = line.includes("Tread Block") || line.includes("Warm-up");

        if (isHeader) {
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = {
                name: line,
                type: "timer",
                intervals: [],
                section: sectionName
            };
            continue;
        }

        if (!currentBlock) {
            // Create default block if text appears before header
            currentBlock = { name: "Treadmill Warmup", type: "timer", intervals: [], section: sectionName };
        }

        // Interval Parsing
        const seconds = parseTimeToSeconds(line);
        if (seconds !== null) {
            let note: string | null = null;
            const detailsMatch = line.match(/\((.*?)\)/);
            if (detailsMatch) note = detailsMatch[1];

            const [zone, color] = getZoneAndColor(line);
            currentBlock.intervals.push({
                type: "interval", seconds, zone, color, note, raw_text: line
            });
        } else {
            // Text/Instruction
            currentBlock.intervals.push({
                type: "card", text: line, color: "bg-zinc-800"
            });
        }
    }

    if (currentBlock) blocks.push(currentBlock);

    // Calculate XP
    for (const block of blocks) {
        let xp = 0;
        for (const interval of block.intervals) {
            if (interval.type === 'interval') {
                const secs = interval.seconds;
                const zone = (interval.zone || "").toUpperCase();
                let factor = 0.1; // Default Base: 6 XP/min
                if (zone.includes("ALL OUT")) factor = 0.4; // 24 XP/min
                else if (zone.includes("PUSH")) factor = 0.2; // 12 XP/min
                else if (zone.includes("WALKING")) factor = 0.05; // 3 XP/min
                xp += Math.floor(secs * factor);
            }
        }
        block.xp_value = xp;
    }

    return blocks;
}

function parseStrengthSection(text: string, sectionName = "Strength Protocol", catalog: CatalogItem[]): any[] {
    const blocks: any[] = [];
    const lines = text.trim().split('\n');

    const stdPattern = /^([\d]+\.|[•◦-])?\s*(.*?):\s+(\d+)\s+sets?/i;
    const supersetPattern = /^([\d]+\.|[•◦-])?\s*(?:Superset|Giant Set|Tri-Set)\s+\((.*?)\)/i;
    const finisherPattern = /^([\d]+\.|[•◦-])?\s*Finisher/i;
    const restPattern = /Rest[:\s]+(?:is\s+)?(\d+)\s*sec/i;

    let tipsBuffer: string[] = [];
    let exerciseIdx = 0;
    let currentSection = sectionName;

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('[')) continue;
        if (line.startsWith('---')) continue;

        if (line.includes("The Engine:")) {
            currentSection = "Engine";
        }

        const matchStd = line.match(stdPattern);
        const matchSuper = line.match(supersetPattern);
        const matchFinish = line.match(finisherPattern);

        const isExercise = !!(matchStd || matchSuper || matchFinish);

        if (isExercise) {
            exerciseIdx += 1;
            const currentBlock: any = {
                section: currentSection,
                tips: [...tipsBuffer],
                intervals: []
            };
            tipsBuffer = [];

            if (matchSuper) {
                const prefix = matchSuper[1];
                const contentInParens = matchSuper[2];

                const exerciseNames = contentInParens ? contentInParens.split('+').map(n => n.trim()) : ["Exercise 1", "Exercise 2"];

                let sets = 3;
                const setsMatch = line.match(/(\d+)\s*Sets?/i);
                if (setsMatch) sets = parseInt(setsMatch[1], 10);

                let restSecs = 0;
                const restMatch = line.match(/Rest[:\s]+(\d+)\s*sec/i);
                if (restMatch) restSecs = parseInt(restMatch[1], 10);

                const childExercises = exerciseNames.map(name => ({
                    name,
                    reps: "10",
                    sets
                }));

                Object.assign(currentBlock, {
                    name: line.includes(':') ? line.split(':')[0].trim() : line,
                    type: "superset",
                    raw_parens_content: contentInParens,
                    sets,
                    rest_seconds: restSecs,
                    xp_value: sets * childExercises.length * 15,
                    description: line,
                    exercises: childExercises,
                });

            } else if (matchStd) {
                const prefix = matchStd[1];
                const name = matchStd[2];
                const setsStr = matchStd[3];
                const sets = parseInt(setsStr, 10);
                const xpFactor = findXpFactor(name, catalog);

                const restMatch = line.match(restPattern);
                const restSecs = restMatch ? parseInt(restMatch[1], 10) : 0;

                let repsDisplay = "10";
                let repsList: number[] | null = null;

                const repMatch = line.match(/x\s*([\d,\s]+)\s*reps/i);
                if (repMatch) {
                    repsDisplay = repMatch[1];
                    if (repsDisplay.includes(',')) {
                        repsList = repsDisplay.split(',').map(r => parseInt(r.trim(), 10)).filter(n => !isNaN(n));
                    }
                }

                let totalXp = Math.floor(sets * 10 * xpFactor);
                if (repsList && repsList.length > 0) {
                    totalXp = Math.floor(repsList.reduce((a, b) => a + b, 0) * xpFactor);
                }

                let displayPrefix = `${exerciseIdx}.`;
                if (prefix && /\d/.test(prefix)) {
                    displayPrefix = prefix;
                }

                Object.assign(currentBlock, {
                    name: `${displayPrefix} ${name}`,
                    type: "checklist_exercise",
                    sets,
                    reps_per_set: repsDisplay,
                    reps_list: repsList,
                    rest_seconds: restSecs,
                    xp_value: totalXp,
                    description: line
                });

            } else if (matchFinish) {
                Object.assign(currentBlock, {
                    name: "Finisher",
                    type: "checklist_exercise",
                    sets: 1,
                    reps_per_set: "Failure",
                    xp_value: 100,
                    description: line
                });
            }

            blocks.push(currentBlock);

        } else {
            if (line.includes("The Lift")) continue;

            if (blocks.length > 0) {
                const lastBlock = blocks[blocks.length - 1];
                const restMatch = line.match(restPattern);
                if (restMatch) {
                    lastBlock.rest_seconds = parseInt(restMatch[1], 10);
                }

                if (lastBlock.type === 'superset' && line.includes('Reps:')) {
                    const repsContent = line.split('Reps:')[1].split('(')[0].trim();
                    const parts = repsContent.split('/');

                    if (parts.length >= lastBlock.exercises.length) {
                        for (let i = 0; i < parts.length; i++) {
                            if (i < lastBlock.exercises.length) {
                                lastBlock.exercises[i].reps = parts[i].trim();
                            }
                        }
                    } else {
                        for (const ex of lastBlock.exercises) {
                            ex.reps = repsContent.trim();
                        }
                    }
                } else if (lastBlock.type === 'superset' && (line.startsWith('◦') || line.startsWith('•'))) {
                    const isExerciseDef = line.includes(':');
                    if (isExerciseDef) {
                        const parts = line.split(':');
                        const exName = parts[0].replace('◦', '').replace('•', '').trim();
                        const exReps = parts.slice(1).join(':').trim();

                        if (!lastBlock.has_bullet_exercises) {
                            if (lastBlock.exercises.length === 1) {
                                lastBlock.exercises = [];
                                lastBlock.has_bullet_exercises = true;
                            }
                        }

                        if (lastBlock.has_bullet_exercises) {
                            lastBlock.exercises.push({
                                name: exName,
                                reps: exReps,
                                sets: lastBlock.sets
                            });
                            continue;
                        }
                    }
                }

                const cleanText = line.replace(/Tip:/i, "").replace(/Form:/i, "").trim();
                if (lastBlock.type === "checklist_exercise") {
                    lastBlock.tips.push(cleanText);
                } else if (lastBlock.type === "superset") {
                    if (!lastBlock.tips) lastBlock.tips = [];
                    lastBlock.tips.push(cleanText);
                } else {
                    lastBlock.intervals.push({ type: "card", text: cleanText, color: "bg-zinc-800" });
                }
            } else {
                tipsBuffer.push(line);
            }
        }
    }

    return blocks;
}

function parseCoreSection(text: string, catalog: CatalogItem[]): any[] {
    const blocks = parseStrengthSection(text, "Abdominal Protocol", catalog);
    for (const b of blocks) {
        b.section = "Core Work";
    }
    return blocks;
}

export function processWorkoutText(text: string, catalog: CatalogItem[]): any[] {
    let treadText = "";
    let strengthText = "";
    let coreText = "";

    const parts = text.split(/\[(TREADMILL|STRENGTH|CORE|ARMOR|ENGINE)\]/i);

    for (let i = 1; i < parts.length; i += 2) {
        const tag = parts[i].toUpperCase();
        const content = parts[i + 1];

        if (tag === "TREADMILL" || tag === "ENGINE") treadText += content;
        else if (tag === "STRENGTH" || tag === "ARMOR") strengthText += content;
        else if (tag === "CORE") coreText += content;
    }

    let allBlocks: any[] = [];

    if (treadText) {
        allBlocks = allBlocks.concat(parseTreadmillSection(treadText, "Engine"));
    }

    if (strengthText) {
        allBlocks = allBlocks.concat(parseStrengthSection(strengthText, "Armor", catalog));
    }

    if (coreText) {
        allBlocks = allBlocks.concat(parseCoreSection(coreText, catalog));
    }

    return allBlocks;
}
