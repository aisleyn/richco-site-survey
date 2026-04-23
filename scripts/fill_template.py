#!/usr/bin/env python3
import sys
import json
import re
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt
from io import BytesIO
import base64
import requests

def fill_template(template_path, output_path, data):
    """Fill a Word template with survey data"""

    # Load the template
    doc = Document(template_path)

    # Dictionary of replacements
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

    # Replace placeholders in paragraphs
    for paragraph in doc.paragraphs:
        for key, value in replacements.items():
            if key in paragraph.text:
                # Replace in runs to preserve formatting
                for run in paragraph.runs:
                    if key in run.text:
                        run.text = run.text.replace(key, str(value))

    # Also replace in tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    for key, value in replacements.items():
                        if key in paragraph.text:
                            for run in paragraph.runs:
                                if key in run.text:
                                    run.text = run.text.replace(key, str(value))

    # Download and insert images if provided
    if data.get('images') and len(data['images']) > 0:
        # Find the images placeholder section and add images
        for idx, image_url in enumerate(data['images'][:3]):  # Limit to 3 images
            try:
                response = requests.get(image_url, timeout=5)
                if response.status_code == 200:
                    image_data = BytesIO(response.content)
                    # Add image to document (would need to find the right place in template)
                    # For now, just try to add it
                    last_paragraph = doc.paragraphs[-1]
                    last_paragraph.add_run().add_picture(image_data, width=Inches(2))
            except Exception as e:
                print(f"Warning: Could not insert image {idx}: {e}", file=sys.stderr)

    # Save the document
    doc.save(output_path)
    return True

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: fill_template.py <template_path> <output_path> <json_data>'}))
        sys.exit(1)

    template_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        # Parse JSON data from argument or stdin
        if len(sys.argv) > 3:
            data = json.loads(sys.argv[3])
        else:
            data = json.load(sys.stdin)

        fill_template(template_path, output_path, data)
        print(json.dumps({'success': True, 'output': output_path}))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
