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

    # Try different formats: {{placeholder}}, {{Placeholder}}, {{PLACEHOLDER}}, and without braces
    patterns = [
        f'{{{{{placeholder}}}}}',  # {{Item.Name}}
        f'{{{{{placeholder.lower()}}}}}',  # {{item.name}}
        f'{{{{{placeholder.upper()}}}}}',  # {{ITEM.NAME}}
        placeholder,  # Item.Name (without braces)
        placeholder.lower(),  # item.name (without braces)
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
        'Item.Name': data.get('areaName', 'N/A'),  # Room/Area name
        'Item.Client': data.get('clientName', 'N/A'),  # Vendor/Client name
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
        if para_text.strip():
            print(f"Para {idx}: {repr(para_text[:150])}", file=sys.stderr)
        for key, value in replacements.items():
            if replace_text_in_paragraph(paragraph, key, value):
                print(f"✓ Replaced '{key}' = '{value}' in paragraph {idx}", file=sys.stderr)
                replaced_count += 1
            elif key in ['Item.Name', 'Item.Client']:
                # Debug logging for Item.Name and Item.Client
                if para_text.strip():
                    print(f"  (Did not find '{key}' in this paragraph)", file=sys.stderr)

    # Also replace in tables
    print(f"Processing {len(doc.tables)} tables", file=sys.stderr)
    for table_idx, table in enumerate(doc.tables):
        for row_idx, row in enumerate(table.rows):
            for cell_idx, cell in enumerate(row.cells):
                for para_idx, paragraph in enumerate(cell.paragraphs):
                    cell_text = ''.join(run.text for run in paragraph.runs)
                    if cell_text.strip():
                        print(f"Table {table_idx}, row {row_idx}, cell {cell_idx}: {cell_text[:100]}", file=sys.stderr)
                    for key, value in replacements.items():
                        if replace_text_in_paragraph(paragraph, key, value):
                            print(f"Replaced '{key}' in table {table_idx}, row {row_idx}, cell {cell_idx}", file=sys.stderr)
                            replaced_count += 1

    print(f"Total text replacements made: {replaced_count}", file=sys.stderr)

    # Handle images - look for Item.Images of Area placeholder
    images_added = 0
    if data.get('images') and len(data['images']) > 0:
        print(f"Attempting to add {len(data['images'])} images", file=sys.stderr)
        # Find the paragraph with Item.Images of Area placeholder
        for para_idx, paragraph in enumerate(doc.paragraphs):
            para_text = ''.join(run.text for run in paragraph.runs)
            if 'Item.Images' in para_text or 'Images of Area' in para_text:
                print(f"Found Images placeholder at paragraph {para_idx}: {para_text[:100]}", file=sys.stderr)
                # Clear the placeholder text
                for run in paragraph.runs:
                    run.text = ''
                # Add all images to this paragraph
                for idx, image_url in enumerate(data['images'][:5]):  # Limit to 5 images
                    if add_image_to_paragraph(paragraph, image_url):
                        images_added += 1
                        print(f"Added image {idx + 1}/{len(data['images'])}", file=sys.stderr)
                break

        # Also check in tables
        if images_added == 0:
            for table_idx, table in enumerate(doc.tables):
                for row_idx, row in enumerate(table.rows):
                    for cell_idx, cell in enumerate(row.cells):
                        for para_idx, paragraph in enumerate(cell.paragraphs):
                            para_text = ''.join(run.text for run in paragraph.runs)
                            if 'Item.Images' in para_text or 'Images of Area' in para_text:
                                print(f"Found Images placeholder in table {table_idx}, row {row_idx}, cell {cell_idx}", file=sys.stderr)
                                # Clear the placeholder text
                                for run in paragraph.runs:
                                    run.text = ''
                                # Add all images to this paragraph
                                for idx, image_url in enumerate(data['images'][:5]):  # Limit to 5 images
                                    if add_image_to_paragraph(paragraph, image_url):
                                        images_added += 1
                                break

    print(f"Total images added: {images_added}", file=sys.stderr)

    # Handle scans - look for Item.Scans of Area placeholder
    scans_added = 0
    if data.get('scans') and len(data['scans']) > 0:
        print(f"Attempting to add {len(data['scans'])} scans", file=sys.stderr)
        # Find the paragraph with Item.Scans of Area placeholder
        for para_idx, paragraph in enumerate(doc.paragraphs):
            para_text = ''.join(run.text for run in paragraph.runs)
            if 'Item.Scans' in para_text or 'Scans of Area' in para_text:
                print(f"Found Scans placeholder at paragraph {para_idx}: {para_text[:100]}", file=sys.stderr)
                # Clear the placeholder text
                for run in paragraph.runs:
                    run.text = ''
                # Add all scans to this paragraph
                for idx, scan_url in enumerate(data['scans'][:5]):  # Limit to 5 scans
                    if add_image_to_paragraph(paragraph, scan_url):
                        scans_added += 1
                        print(f"Added scan {idx + 1}/{len(data['scans'])}", file=sys.stderr)
                break

        # Also check in tables
        if scans_added == 0:
            for table_idx, table in enumerate(doc.tables):
                for row_idx, row in enumerate(table.rows):
                    for cell_idx, cell in enumerate(row.cells):
                        for para_idx, paragraph in enumerate(cell.paragraphs):
                            para_text = ''.join(run.text for run in paragraph.runs)
                            if 'Item.Scans' in para_text or 'Scans of Area' in para_text:
                                print(f"Found Scans placeholder in table {table_idx}, row {row_idx}, cell {cell_idx}", file=sys.stderr)
                                # Clear the placeholder text
                                for run in paragraph.runs:
                                    run.text = ''
                                # Add all scans to this paragraph
                                for idx, scan_url in enumerate(data['scans'][:5]):  # Limit to 5 scans
                                    if add_image_to_paragraph(paragraph, scan_url):
                                        scans_added += 1
                                break

    print(f"Total scans added: {scans_added}", file=sys.stderr)

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
