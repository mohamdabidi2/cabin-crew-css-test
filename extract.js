const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfFiles = [
    'CABIN CREW QUESTIONS  1.pdf',
    'CABIN CREW QUESTIONS  2.pdf',
    'CABIN CREW QUESTIONS  3.pdf',
    'CABIN CREW QUESTIONS  4.pdf',
    'CABIN CREW WRITTEN QUESTIONS.pdf'
];

async function extractQuestions() {
    let allQuestions = [];

    for (const file of pdfFiles) {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${file}`);
            continue;
        }

        const dataBuffer = fs.readFileSync(filePath);
        try {
            const data = await pdf(dataBuffer);
            const text = data.text;

            // Basic extraction logic - looking for Q1-, Q2-, etc.
            // This is a heuristic and might need adjustment based on PDF layout
            const questions = parseText(text, file);
            allQuestions = allQuestions.concat(questions);
            console.log(`Extracted ${questions.length} questions from ${file}`);
        } catch (error) {
            console.error(`Error parsing ${file}:`, error);
        }
    }

    // Deduplicate and save
    const uniqueQuestions = deduplicate(allQuestions);
    fs.writeFileSync('questions.json', JSON.stringify(uniqueQuestions, null, 2));
    console.log(`Saved ${uniqueQuestions.length} unique questions to questions.json`);
}

function parseText(text, filename) {
    const questions = [];
    // Split by "Q" followed by digits and a dash or space
    const parts = text.split(/\nQ\s*\d+[\s-]/);

    // Skip the first part (usually header info)
    for (let i = 1; i < parts.length; i++) {
        let content = parts[i].trim();

        // Split content into lines
        let lines = content.split('\n').map(l => l.trim()).filter(l => l);

        if (lines.length < 2) continue;

        let questionText = "";
        let options = [];
        let correctAnswer = "";

        // Heuristic: question text until we see A-, B-, or C- or a checkbox
        let foundOptions = false;
        for (let line of lines) {
            if (line.match(/^[A-G](?:\s*[-.)]|\s*□)/i)) {
                foundOptions = true;
                options.push(line);
            } else if (!foundOptions) {
                questionText += (questionText ? " " : "") + line;
            }
        }

        // Detect correct answer using markers (heuristic)
        let foundCorrect = false;
        options.forEach((opt, idx) => {
            // Characters like ¡, √, □ often indicate the selected/correct option in PDF text
            if (opt.includes('¡') || opt.includes('√') || opt.includes('•') || opt.includes('✅') || opt.includes('')) {
                correctAnswer = String.fromCharCode(65 + idx);
                foundCorrect = true;
            }
        });

        if (!foundCorrect) {
            let answerMatch = content.match(/Correct Answer[:\s]*([A-G])/i) ||
                content.match(/Ans[:\s]*([A-G])/i) ||
                content.match(/([A-G])\s+is\s+correct/i);

            if (answerMatch) {
                correctAnswer = answerMatch[1].toUpperCase();
            } else {
                correctAnswer = "A"; // Fallback
            }
        }

        if (questionText && options.length > 0) {
            questions.push({
                id: `${filename}_${i}`,
                question: questionText.split('Page ')[0].split('Libyan Civil')[0].trim(),
                options: options.map(opt => opt.replace(/^[A-G](?:\s*[-.)]|\s*□)\s*/i, '').replace(/[¡√•✅]/g, '').trim()),
                correctAnswer: correctAnswer,
                source: filename
            });
        }
    }
    return questions;
}

function deduplicate(questions) {
    const seen = new Set();
    return questions.filter(q => {
        const key = q.question.toLowerCase().replace(/\s+/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

extractQuestions();
