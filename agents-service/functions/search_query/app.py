# /home/ubuntu/HRInsignt/services/functions/search_query/app.py

import json
import boto3
import re
import os
import psycopg2
from tabulate import tabulate
from typing import Optional, List, Dict
import logging
from datetime import datetime, date
from decimal import Decimal

# Set up logging configuration
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Update the JSON encoder to handle both Decimal and date types
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super(CustomJSONEncoder, self).default(obj)

def create_response(status_code: int, body: dict) -> dict:
    logger.info(f"Creating response with status code: {status_code}")
    return {
        "statusCode": status_code,
        "body": json.dumps(body, cls=CustomJSONEncoder),
        "headers": {
            'Access-Control-Allow-Origin': os.environ.get('ALLOWED_ORIGINS', '*'),
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        }
    }

def generate_sql_query(prompt: str, table_description: str) -> str:
    logger.info(f"Generating SQL query for prompt: {prompt}")
    bedrock = boto3.client('bedrock-runtime', 
        region_name='us-west-2'
)    
    full_prompt = f"""Given the following SQL table structure:
{table_description}

Generate a SQL query for the following question:
{prompt}

Return only the SQL query without any explanation."""

    request_body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2000,
        "temperature": 0.0,
        "messages": [
            {
                "role": "user",
                "content": [{
                    "type": "text",
                    "text": full_prompt
                }]
            }
        ]
    }

    try:
        logger.info("Invoking Bedrock model")
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
            body=json.dumps(request_body)
        )
        sql_query = json.loads(response['body'].read())['content'][0]['text']
        clean_query = re.sub(r'```sql|```', '', sql_query).strip()
        logger.info(f"Generated SQL query: {clean_query}")
        return clean_query
    except Exception as e:
        logger.error(f"Error generating SQL query: {str(e)}", exc_info=True)
        raise Exception(f"Error generating SQL query: {str(e)}")
    finally:
        bedrock.close()

def execute_query(sql_query: str) -> Optional[List[Dict]]:
    logger.info(f"Executing SQL query: {sql_query}")
    connection = None
    try:
        connection = psycopg2.connect(
            host=os.environ['DB_HOST'],
            database=os.environ['DB_NAME'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            port=os.environ['DB_PORT']
        )
        logger.info("Database connection established")
        
        cursor = connection.cursor()
        cursor.execute(sql_query)
        
        is_select = sql_query.strip().upper().startswith('SELECT')
        
        if is_select:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            if not rows:
                logger.info("Query returned no results")
                return None
                
            result = [dict(zip(columns, row)) for row in rows]
            logger.info(f"Query returned {len(result)} rows")
            return result
        else:
            affected_rows = cursor.rowcount
            connection.commit()
            logger.info(f"Query affected {affected_rows} rows")
            return {"affected_rows": affected_rows}
            
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        if connection:
            connection.rollback()
        raise e
    finally:
        if connection:
            connection.close()
            logger.info("Database connection closed")

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    
    if event.get('httpMethod') == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        return create_response(200, {"message": "OK"})

    try:
        body = json.loads(event.get('body', '{}'))
        prompt = body.get('prompt')
        
        if not prompt:
            logger.warning("Missing 'prompt' in request body")
            return create_response(400, {
                "error": "Missing 'prompt' in request body"
            })

        logger.info(f"Processing prompt: {prompt}")

        table_description = """
        CREATE TABLE employees (
            employee_id SERIAL PRIMARY KEY,
            employee_name VARCHAR(100) NOT NULL,
            job_id INTEGER,
            salary NUMERIC(10,2),
            date_hired DATE
        );

        CREATE TABLE jobs (
            job_id SERIAL PRIMARY KEY,
            dept_id INTEGER,
            job_name VARCHAR(100) NOT NULL,
            job_description TEXT
        );

        CREATE TABLE departments (
            dept_id SERIAL PRIMARY KEY,
            dept_name VARCHAR(100) NOT NULL,
            dept_description TEXT
        );
        """

        sql_query = generate_sql_query(prompt, table_description)
        results = execute_query(sql_query)

        logger.info("Request processed successfully")
        return create_response(200, {
            "success": True,
            "query": sql_query,
            "results": results
        })

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        return create_response(500, {
            "success": False,
            "error": str(e)
        })