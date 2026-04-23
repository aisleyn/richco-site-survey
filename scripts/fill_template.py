#!/usr/bin/env python3
import sys
import json
import re
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt
from io import BytesIO
import requests

def replace_text_in_paragraph(paragraph, key, value):
    """Replace placeholder in paragraph, handling split runs"""
    if key not in paragraph.text:
        return False

    # Reconstruct the full text from all runs
    full_text = ''.join(run.text for run in paragraph.runs)

    # Check if placeholder exists
    if key not in full_text:
        return False

    # Replace the text
    new_text = full_text.replace(key, str(value))

    # Clear all runs
    for run in paragraph.runs:
        run.text = ''

    # Add the new text to the first run
    if paragraph.runs:
        paragraph.runs[0].text = new_text
    else:
        paragraph.add_run(new_text)

    return True

def fill_template(template_path, output_path, data):
    """Fill a Word template with survey data"""

    print(f"Loading template from: {template_path}", file=sys.stderr)
    doc = Document(template_path)

    # Dictionary of replacements - try both with and without spaces
    replacements = {
        'Item.Name': data.get('clientName', 'N/A'),
        'Item.Client': data.get('clientName', 'N/A'),
        'Item.Area Name/ Room Number': data.get('areaName', 'N/A'),
        'Item.Area Size (Sqft)': data.get('areaSize', 'N/A'),
        'Item.Survey Date': data.get('surveyDate', 'N/A'),
        'Item.Survey Notes': data.get('surveyNotes', 'N/A'),
        'Item.Suggested System': data.get('recommendedSystem', 'N/A'),
        'Item.Notes Regarding Install': data.get('notes', 'N/A'),
    }

    print(f"Replacements: {replacements}", file=sys.stderr)

    replaced_count = 0

    # Replace placeholders in paragraphs
    print(f"Processing {len(doc.paragraphs)} paragraphs", file=sys.stderr)
    for idx, paragraph in enumerate(doc.paragraphs):
        for key, value in replacements.items():
            if replace_text_in_paragraph(paragraph, key, value):
                print(f"Replaced '{key}' in paragraph {idx}", file=sys.stderr)
                replaced_count += 1

    # Also replace in tables
    print(f"Processing {len(doc.tables)} tables", file=sys.stderr)
    for table_idx, table in enumerate(doc.tables):
        for row_idx, row in enumerate(table.rows):
            for cell_idx, cell in enumerate(row.cells):
                for para_idx, paragraph in enumerate(cell.paragraphs):
                    for key, value in replacements.items():
                        if replace_text_in_paragraph(paragraph, key, value):
                            print(f"Replaced '{key}' in table {table_idx}, row {row_idx}, cell {cell_idx}, para {para_idx}", file=sys.stderr)
                            replaced_count += 1

    print(f"Total replacements made: {replaced_count}", file=sys.stderr)

    # Save the document
    print(f"Saving document to: {output_path}", file=sys.stderr)
    doc.save(output_path)
    return True

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: fill_template.py <template_path> <output_path> <json_data>'}))
        sys.exit(1)

    template_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        # Parse JSON data from argument
        if len(sys.argv) > 3:
            data = json.loads(sys.argv[3])
        else:
            data = json.load(sys.stdin)

        print(f"Starting template fill with data keys: {list(data.keys())}", file=sys.stderr)
        fill_template(template_path, output_path, data)
        print(json.dumps({'success': True, 'output': output_path}))
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
