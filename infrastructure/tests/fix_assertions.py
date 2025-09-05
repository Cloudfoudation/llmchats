#!/usr/bin/env python3
"""
Script to fix test assertions to use exact status codes instead of ranges
"""

import re
import os

# Define the correct status codes based on REST API standards and actual implementation
STATUS_CODE_MAPPING = {
    # Success cases - based on actual API implementation
    'create_success': 201,  # POST operations return 201 Created
    'read_success': 200,    # GET operations return 200 OK
    'update_success': 200,  # PUT operations return 200 OK
    'delete_success': 200,  # DELETE operations return 200 OK (some APIs use 204, but ours use 200)
    
    # Error cases - based on REST standards
    'unauthorized': 401,    # Missing/invalid auth
    'forbidden': 403,       # Valid auth but no permission
    'not_found': 404,       # Resource doesn't exist
    'bad_request': 400,     # Validation error
    'unprocessable': 422,   # Semantic error
}

def fix_assertions_in_file(filepath):
    """Fix assertions in a single test file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern to match assertIn with status codes
    pattern = r'self\.assertIn\(status_code,\s*\[([^\]]+)\]\)'
    
    def replace_assertion(match):
        status_codes = match.group(1)
        # Parse the status codes
        codes = [int(x.strip()) for x in status_codes.split(',')]
        
        # Determine the correct single status code based on context
        if len(codes) == 1:
            return f'self.assertEqual(status_code, {codes[0]})'
        
        # For multiple codes, choose the most appropriate one
        if 201 in codes and 200 in codes:
            # Create operations should return 201
            return f'self.assertEqual(status_code, 201)'
        elif 200 in codes and 204 in codes:
            # Update operations should return 200
            return f'self.assertEqual(status_code, 200)'
        elif 401 in codes and 403 in codes:
            # Authorization errors should be 403 for our APIs
            return f'self.assertEqual(status_code, 403)'
        elif 403 in codes and 404 in codes:
            # Resource access errors should be 404 for not found, 403 for forbidden
            # Default to 404 for "not found" scenarios
            return f'self.assertEqual(status_code, 404)'
        elif 400 in codes and 422 in codes:
            # Validation errors should be 400
            return f'self.assertEqual(status_code, 400)'
        else:
            # For other cases, use the first (most common) status code
            return f'self.assertEqual(status_code, {codes[0]})'
    
    # Apply the replacements
    content = re.sub(pattern, replace_assertion, content)
    
    # Write back if changed
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed assertions in {filepath}")
        return True
    return False

def main():
    """Fix assertions in all test files"""
    test_files = [
        'test_knowledge_base.py',
        'test_agent_management.py', 
        'test_user_management.py',
        'test_group_management.py',
        'test_shared_resources.py'
    ]
    
    fixed_count = 0
    for test_file in test_files:
        if os.path.exists(test_file):
            if fix_assertions_in_file(test_file):
                fixed_count += 1
        else:
            print(f"Warning: {test_file} not found")
    
    print(f"\nFixed assertions in {fixed_count} files")

if __name__ == '__main__':
    main()
