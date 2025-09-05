import json
import base64
import tempfile
import os
import PyPDF2
from docx import Document
import traceback

def create_response(status_code, body):
    return {
        "statusCode": status_code,
        "body": json.dumps(body),
        "headers": {
            'Access-Control-Allow-Origin': os.environ.get('ALLOWED_ORIGINS', '*'),
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
        }
    }

def extract_text_from_pdf(file_content):
    """Extract text from a PDF file content"""
    text = ""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        temp_file.write(file_content)
        temp_file.flush()
        
        try:
            reader = PyPDF2.PdfReader(temp_file.name)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        finally:
            # Clean up temp file
            os.unlink(temp_file.name)
    
    return text

def extract_text_from_docx(file_content):
    """Extract text from a Word document content"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as temp_file:
        temp_file.write(file_content)
        temp_file.flush()
        
        try:
            doc = Document(temp_file.name)
            text = [paragraph.text for paragraph in doc.paragraphs]
        finally:
            # Clean up temp file
            os.unlink(temp_file.name)
            
    return '\n'.join(text)

def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {"success": True})
    
    try:
        # Parse request body
        body = json.loads(event['body'])
        file_type = body.get('fileType', '').lower()
        file_content_base64 = body.get('fileContent')
        
        if not file_type or not file_content_base64:
            return create_response(400, {
                "success": False,
                "error": {
                    "code": "MISSING_PARAMETER",
                    "message": "File content and file type are required"
                }
            })
        
        # Decode base64 file content
        try:
            file_content = base64.b64decode(file_content_base64)
        except Exception as e:
            return create_response(400, {
                "success": False,
                "error": {
                    "code": "INVALID_FILE_CONTENT",
                    "message": "File content must be base64 encoded"
                }
            })
        
        # Process the document based on file type
        if file_type in ['pdf']:
            text = extract_text_from_pdf(file_content)
        elif file_type in ['docx', 'doc']:
            text = extract_text_from_docx(file_content)
        else:
            return create_response(400, {
                "success": False,
                "error": {
                    "code": "UNSUPPORTED_FILE_TYPE",
                    "message": f"Unsupported file type: {file_type}. Supported types: pdf, docx, doc"
                }
            })
        
        # Return the extracted text
        return create_response(200, {
            "success": True,
            "data": {
                "text": text,
                "length": len(text),
                "previewText": text[:1000] + "..." if len(text) > 1000 else text
            }
        })
            
    except Exception as e:
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        return create_response(500, {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        })