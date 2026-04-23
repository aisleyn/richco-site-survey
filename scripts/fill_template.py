#!/usr/bin/env python3
import sys
import json
import re
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt
from docx.oxml import parse_xml
from io import BytesIO
import requests

def replace_text_in_paragraph(paragraph, placeholder, value):
    """Replace placeholder in paragraph, handling split runs and braces"""
    full_text = ''.join(run.text for run in paragraph.runs)

    # Try different formats: {{placeholder}}, {{Placeholder}}, {{PLACEHOLDER}}
    patterns = [
        f'{{{{{placeholder}}}}}',  # {{Item.Name}}
        f'{{{{{placeholder.lower()}}}}}',  # {{item.name}}
        f'{{{{{placeholder.upper()}}}}}',  # {{ITEM.NAME}}
    ]

    found = False
    for pattern in patterns:
        if pattern in full_text:
            full_text = full_text.replace(pattern, str(value))
            found = True
            break

    if not found:
        return False

    # Clear all runs
    for run in paragraph.runs:
        run.text = ''

    # Add the new text to the first run
    if paragraph.runs:
        paragraph.runs[0].text = full_text
    else:
        paragraph.add_run(full_text)

    return True

def add_image_to_paragraph(paragraph, image_url):
    """Add image from URL to paragraph"""
    try:
        response = requests.get(image_url, timeout=10)
        if response.status_code == 200:
            image_data = BytesIO(response.content)
            paragraph.add_run().add_picture(image_data, width=Inches(2))
            return True
    except Exception as e:
        print(f"Warning: Could not insert image {image_url}: {e}", file=sys.stderr)
    return False

def fill_template(template_path, output_path, data):
    """Fill a Word template with survey data"""

    print(f"Loading template from: {template_path}", file=sys.stderr)
    doc = Document(template_path)

    # Dictionary of replacements with both display name and actual placeholder
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

    print(f"Replacements to make: {replacements}", file=sys.stderr)
    replaced_count = 0

    # Replace placeholders in paragraphs
    print(f"Processing {len(doc.paragraphs)} paragraphs", file=sys.stderr)
    for idx, paragraph in enumerate(doc.paragraphs):
        para_text = ''.join(run.text for run in paragraph.runs)
        for key, value in replacements.items():
            if replace_text_in_paragraph(paragraph, key, value):
                print(f"Replaced '{{{{key}}}}' in paragraph {idx}", file=sys.stderr)
                replaced_count += 1

    # Also replace in tables
    print(f"Processing {len(doc.tables)} tables", file=sys.stderr)
    for table_idx, table in enumerate(doc.tables):
        for row_idx, row in enumerate(table.rows):
            for cell_idx, cell in enumerate(row.cells):
                for para_idx, paragraph in enumerate(cell.paragraphs):
                    for key, value in replacements.items():
                        if replace_text_in_paragraph(paragraph, key, value):
                            print(f"Replaced '{key}' in table {table_idx}, row {row_idx}, cell {cell_idx}", file=sys.stderr)
                            replaced_count += 1

    print(f"Total text replacements made: {replaced_count}", file=sys.stderr)

    # Handle images - look for Image placeholders and try to replace them
    images_added = 0
    if data.get('images') and len(data['images']) > 0:
        print(f"Attempting to add {len(data['images'])} images", file=sys.stderr)
        for idx, image_url in enumerate(data['images'][:3]):  # Limit to 3 images
            # Try to find an image placeholder and replace it
            for para_idx, paragraph in enumerate(doc.paragraphs):
                para_text = ''.join(run.text for run in paragraph.runs)
                if 'Image' in para_text and 'Item.Images' in para_text:
                    if add_image_to_paragraph(paragraph, image_url):
                        images_added += 1
                        print(f"Added image {idx + 1}/{len(data['images'])}", file=sys.stderr)
                        break
            else:
                # If no Image placeholder found, try adding to last paragraph
                if idx == 0 and len(doc.paragraphs) > 0:
                    if add_image_to_paragraph(doc.paragraphs[-1], image_url):
                        images_added += 1

    print(f"Total images added: {images_added}", file=sys.stderr)

    # Save the document
    print(f"Saving document to: {output_path}", file=sys.stderr)
    doc.save(output_path)
    print(f"Template fill complete", file=sys.stderr)
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

        print(f"Starting template fill with data: {data}", file=sys.stderr)
        fill_template(template_path, output_path, data)
        print(json.dumps({'success': True, 'output': output_path}))
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
