import json
import re

# Load the questions
with open('questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

# Counter for changes
changes_made = 0

# Process each question
for q_idx, question in enumerate(questions):
    options = question['options']
    
    # Process each option
    for i, option in enumerate(options):
        original_option = option
        
        # Create a mapping of letters to option texts
        letter_to_option = {
            'A': options[0] if len(options) > 0 else None,
            'B': options[1] if len(options) > 1 else None,
            'C': options[2] if len(options) > 2 else None,
            'D': options[3] if len(options) > 3 else None,
            'E': options[4] if len(options) > 4 else None,
            'F': options[5] if len(options) > 5 else None,
        }
        
        # Pattern 1: "answers A & B are correct"
        match = re.search(r'answers?\s+([A-F])\s*&\s*([A-F])\s+are\s+correct', option, re.IGNORECASE)
        if match:
            letter1 = match.group(1).upper()
            letter2 = match.group(2).upper()
            if letter_to_option[letter1] and letter_to_option[letter2]:
                new_text = f"{{{letter_to_option[letter1]}}} & {{{letter_to_option[letter2]}}} are correct."
                options[i] = new_text
                changes_made += 1
                print(f"Q{q_idx+1}, Option {chr(65+i)}: Changed '{original_option}' -> '{new_text}'")
                continue
        
        # Pattern 2: "answer A and B"
        match = re.search(r'answers?\s+([A-F])\s+and\s+([A-F])\s+are\s+correct', option, re.IGNORECASE)
        if match:
            letter1 = match.group(1).upper()
            letter2 = match.group(2).upper()
            if letter_to_option[letter1] and letter_to_option[letter2]:
                new_text = f"{{{letter_to_option[letter1]}}} & {{{letter_to_option[letter2]}}} are correct."
                options[i] = new_text
                changes_made += 1
                print(f"Q{q_idx+1}, Option {chr(65+i)}: Changed '{original_option}' -> '{new_text}'")
                continue
        
        # Pattern 3: "answers A+B+C are correct"
        match = re.search(r'answers?\s+([A-F])\s*\+\s*([A-F])(?:\s*\+\s*([A-F]))?\s+are\s+correct', option, re.IGNORECASE)
        if match:
            letters = [match.group(j) for j in range(1, 4) if match.group(j)]
            letter_texts = [f"{{{letter_to_option[letter.upper()]}}}" for letter in letters if letter_to_option.get(letter.upper())]
            if letter_texts:
                new_text = " & ".join(letter_texts) + " are correct."
                options[i] = new_text
                changes_made += 1
                print(f"Q{q_idx+1}, Option {chr(65+i)}: Changed '{original_option}' -> '{new_text}'")
                continue
        
        # Pattern 4: "Both answers are correct" or "both answers are correct."
        if re.search(r'\b(?:both|all)\s+(?:of\s+the\s+above\s+)?answers?\s+are\s+correct', option, re.IGNORECASE):
            # This references all previous options
            referenced_options = [f"{{{opt}}}" for j, opt in enumerate(options) if j != i]
            if referenced_options:
                new_text = " & ".join(referenced_options) + " are correct."
                options[i] = new_text
                changes_made += 1
                print(f"Q{q_idx+1}, Option {chr(65+i)}: Changed '{original_option}' -> '{new_text}'")
                continue
        
        # Pattern 5: "All choices are correct"
        if re.search(r'\ball\s+choices\s+are\s+correct', option, re.IGNORECASE):
            referenced_options = [f"{{{opt}}}" for j, opt in enumerate(options) if j != i]
            if referenced_options:
                new_text = " & ".join(referenced_options) + " are correct."
                options[i] = new_text
                changes_made += 1
                print(f"Q{q_idx+1}, Option {chr(65+i)}: Changed '{original_option}' -> '{new_text}'")
                continue

# Save the updated questions
with open('questions.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print(f"\nTransformation complete! {changes_made} changes made.")
